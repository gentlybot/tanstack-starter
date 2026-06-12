// Tools the chat assistant can call. Server tools run next to your data —
// add a toolDefinition + .server() implementation here, then pass it to
// chat() in src/routes/api.chat.ts.

import { toolDefinition } from "@tanstack/ai";
import { desc } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db/index";
import { tasks } from "#/db/schema";

export const listTasksToolDef = toolDefinition({
	name: "listTasks",
	description:
		"List the user's tasks with their current status (pending, processing, or done).",
	inputSchema: z.object({}),
	outputSchema: z.array(
		z.object({
			id: z.number(),
			title: z.string(),
			status: z.string(),
		}),
	),
});

export const listTasksTool = listTasksToolDef.server(async () => {
	const rows = await db.query.tasks.findMany({
		orderBy: [desc(tasks.createdAt)],
		limit: 50,
	});
	return rows.map(({ id, title, status }) => ({ id, title, status }));
});
