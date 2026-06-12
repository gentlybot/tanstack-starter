import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const taskStatuses = ["pending", "processing", "done"] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const tasks = pgTable("tasks", {
	id: serial("id").primaryKey(),
	title: text("title").notNull(),
	status: text("status", { enum: taskStatuses }).notNull().default("pending"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type Task = typeof tasks.$inferSelect;
