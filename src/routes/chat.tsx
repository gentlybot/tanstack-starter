import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Loader2, Send, Square, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import type { ChatMessages } from "#/lib/chat";
import { useAppChat } from "#/lib/chat";

const getAiStatus = createServerFn({ method: "GET" }).handler(async () => ({
	configured: Boolean(
		process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
	),
}));

export const Route = createFileRoute("/chat")({
	component: ChatPage,
	loader: async () => await getAiStatus(),
});

function SetupNotice() {
	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">AI Chat</p>
				<h1 className="display-title mb-3 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
					Almost there — add an API key
				</h1>
				<p className="mb-6 max-w-2xl text-sm leading-6 text-[var(--sea-ink-soft)]">
					The chat assistant streams responses from a model provider. Set{" "}
					<code className="rounded bg-[var(--chip-bg)] px-1.5 py-0.5 text-xs">
						ANTHROPIC_API_KEY
					</code>{" "}
					(or{" "}
					<code className="rounded bg-[var(--chip-bg)] px-1.5 py-0.5 text-xs">
						OPENAI_API_KEY
					</code>
					) in{" "}
					<code className="rounded bg-[var(--chip-bg)] px-1.5 py-0.5 text-xs">
						.env.local
					</code>{" "}
					and restart the dev server. On gently, add it as a secret in the
					workspace settings instead.
				</p>
				<p className="m-0 text-sm text-[var(--sea-ink-soft)]">
					The endpoint lives in{" "}
					<code className="rounded bg-[var(--chip-bg)] px-1.5 py-0.5 text-xs">
						src/routes/api.chat.ts
					</code>{" "}
					— swap providers or models there.
				</p>
			</section>
		</main>
	);
}

function MessageParts({ parts }: { parts: ChatMessages[number]["parts"] }) {
	return (
		<>
			{parts.map((part, index) => {
				if (part.type === "text" && part.content) {
					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: stream parts are append-only and have no stable id
						<div key={index} className="prose prose-sm min-w-0 max-w-none">
							<Streamdown>{part.content}</Streamdown>
						</div>
					);
				}
				if (part.type === "tool-call") {
					return (
						<span
							key={part.id ?? index}
							className="my-1 inline-flex items-center gap-1.5 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-2.5 py-1 text-xs font-medium text-[var(--sea-ink-soft)]"
						>
							<Wrench className="h-3 w-3" />
							{part.name}
						</span>
					);
				}
				return null;
			})}
		</>
	);
}

function ChatPage() {
	const { configured } = Route.useLoaderData();
	const { messages, sendMessage, isLoading, stop } = useAppChat();
	const [input, setInput] = useState("");
	const bottomRef = useRef<HTMLDivElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on every new message
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	if (!configured) return <SetupNotice />;

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		const text = input.trim();
		if (!text || isLoading) return;
		setInput("");
		sendMessage(text);
	};

	return (
		<main className="page-wrap flex h-[calc(100vh-8rem)] flex-col px-4 py-6">
			<section className="island-shell flex min-h-0 flex-1 flex-col rounded-2xl">
				<div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
					{messages.length === 0 && (
						<div className="flex h-full flex-col items-center justify-center text-center">
							<p className="island-kicker mb-2">AI Chat</p>
							<h1 className="display-title mb-3 text-2xl font-bold text-[var(--sea-ink)]">
								Ask me anything
							</h1>
							<p className="max-w-md text-sm text-[var(--sea-ink-soft)]">
								Streaming chat with tool calling. Try “what's on my task list?”
								— the assistant reads it from the database.
							</p>
						</div>
					)}
					{messages.map((message) => (
						<div
							key={message.id}
							className={`mb-4 flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
						>
							<div
								className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white ${
									message.role === "assistant"
										? "bg-[var(--lagoon-deep)]"
										: "bg-[var(--sea-ink-soft)]"
								}`}
							>
								{message.role === "assistant" ? "AI" : "You"}
							</div>
							<div
								className={`min-w-0 max-w-[85%] rounded-2xl px-4 py-2.5 ${
									message.role === "assistant"
										? "bg-[var(--chip-bg)]"
										: "border border-[var(--line)] bg-white/50 dark:bg-white/5"
								}`}
							>
								<MessageParts parts={message.parts} />
							</div>
						</div>
					))}
					<div ref={bottomRef} />
				</div>

				<form
					onSubmit={handleSubmit}
					className="flex gap-2 border-t border-[var(--line)] p-3 sm:p-4"
				>
					<input
						type="text"
						value={input}
						onChange={(event) => setInput(event.target.value)}
						placeholder="Send a message…"
						className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white/60 px-4 py-2.5 text-sm text-[var(--sea-ink)] outline-none transition focus:border-[rgba(79,184,178,0.6)] dark:bg-white/5"
					/>
					{isLoading ? (
						<button
							type="button"
							onClick={stop}
							className="flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--sea-ink)] transition hover:bg-[var(--link-bg-hover)]"
						>
							<Square className="h-3.5 w-3.5" /> Stop
						</button>
					) : (
						<button
							type="submit"
							disabled={!input.trim()}
							className="flex items-center gap-2 rounded-xl border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-4 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] transition hover:bg-[rgba(79,184,178,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Send className="h-4 w-4" />
							)}
							Send
						</button>
					)}
				</form>
			</section>
		</main>
	);
}
