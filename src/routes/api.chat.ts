import { chat, maxIterations, toServerSentEventsResponse } from "@tanstack/ai";
import { anthropicText } from "@tanstack/ai-anthropic";
import { openaiText } from "@tanstack/ai-openai";
import { createFileRoute } from "@tanstack/react-router";

import { listTasksTool } from "#/lib/chat-tools";

const SYSTEM_PROMPT = `You are the built-in assistant for this app.
Be concise and helpful. When the user asks about their tasks, use the
listTasks tool instead of guessing.`;

function pickAdapter() {
	if (process.env.ANTHROPIC_API_KEY) return anthropicText("claude-haiku-4-5");
	if (process.env.OPENAI_API_KEY) return openaiText("gpt-4o-mini");
	return null;
}

export const Route = createFileRoute("/api/chat")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const adapter = pickAdapter();
				if (!adapter) {
					return Response.json(
						{
							error:
								"No AI provider configured. Set ANTHROPIC_API_KEY (or OPENAI_API_KEY) and restart.",
						},
						{ status: 503 },
					);
				}

				const abortController = new AbortController();
				try {
					const { messages } = await request.json();

					const stream = chat({
						adapter,
						tools: [listTasksTool],
						systemPrompts: [SYSTEM_PROMPT],
						agentLoopStrategy: maxIterations(5),
						messages,
						abortController,
					});

					return toServerSentEventsResponse(stream, { abortController });
				} catch (error) {
					if (
						(error as Error).name === "AbortError" ||
						abortController.signal.aborted
					) {
						return new Response(null, { status: 499 });
					}
					console.error("[api/chat]", error);
					return Response.json(
						{ error: "Failed to process chat request" },
						{ status: 500 },
					);
				}
			},
		},
	},
});
