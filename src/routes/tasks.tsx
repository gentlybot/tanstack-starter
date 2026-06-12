import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { desc } from "drizzle-orm";
import { useState } from "react";

import { db } from "#/db/index";
import type { Task, TaskStatus } from "#/db/schema";
import { tasks } from "#/db/schema";
import { enqueue } from "#/jobs/boss";
import type { ProcessTaskPayload } from "#/jobs/queues";
import { PROCESS_TASK } from "#/jobs/queues";

const listTasks = createServerFn({ method: "GET" }).handler(async () => {
	return await db.query.tasks.findMany({
		orderBy: [desc(tasks.createdAt)],
		limit: 50,
	});
});

const createTask = createServerFn({ method: "POST" })
	.validator((data: { title: string }) => {
		const title = data.title?.trim();
		if (!title) throw new Error("Title is required");
		return { title };
	})
	.handler(async ({ data }) => {
		const [task] = await db
			.insert(tasks)
			.values({ title: data.title })
			.returning();
		// Hand the slow part to the background worker and return immediately.
		await enqueue<ProcessTaskPayload>(PROCESS_TASK, { taskId: task.id });
		return task;
	});

const tasksQueryKey = ["tasks"] as const;

export const Route = createFileRoute("/tasks")({
	component: TasksPage,
	loader: async () => await listTasks(),
});

const STATUS_STYLES: Record<TaskStatus, string> = {
	pending:
		"bg-[rgba(212,160,23,0.14)] text-[#8a6d1a] border-[rgba(212,160,23,0.35)]",
	processing:
		"bg-[rgba(79,184,178,0.16)] text-[var(--lagoon-deep)] border-[rgba(79,184,178,0.4)]",
	done: "bg-[rgba(47,106,74,0.12)] text-[#2f6a4a] border-[rgba(47,106,74,0.3)]",
};

function StatusChip({ status }: { status: TaskStatus }) {
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
		>
			{status === "processing" && (
				<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
			)}
			{status}
		</span>
	);
}

function TasksPage() {
	const initialTasks = Route.useLoaderData();
	const queryClient = useQueryClient();
	const [title, setTitle] = useState("");

	const { data: taskList = [] } = useQuery({
		queryKey: tasksQueryKey,
		queryFn: () => listTasks(),
		initialData: initialTasks,
		// Poll while any task is still being worked on, then go quiet.
		refetchInterval: (query) =>
			query.state.data?.some((task: Task) => task.status !== "done")
				? 1200
				: false,
	});

	const addTask = useMutation({
		mutationFn: (newTitle: string) => createTask({ data: { title: newTitle } }),
		onSuccess: () => {
			setTitle("");
			queryClient.invalidateQueries({ queryKey: tasksQueryKey });
		},
	});

	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Database + Background Jobs</p>
				<h1 className="display-title mb-3 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
					Tasks
				</h1>
				<p className="mb-8 max-w-2xl text-sm leading-6 text-[var(--sea-ink-soft)]">
					Adding a task inserts a row in Postgres (Drizzle) and enqueues a
					background job (pg-boss). The worker process picks it up, "works" for
					a few seconds, and marks it done — the list below polls with TanStack
					Query until everything settles.
				</p>

				<form
					className="mb-8 flex flex-col gap-2 sm:flex-row"
					onSubmit={(event) => {
						event.preventDefault();
						if (title.trim() && !addTask.isPending) addTask.mutate(title);
					}}
				>
					<input
						type="text"
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						placeholder="What needs doing?"
						className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white/60 px-4 py-2.5 text-sm text-[var(--sea-ink)] outline-none transition focus:border-[rgba(79,184,178,0.6)] dark:bg-white/5"
					/>
					<button
						type="submit"
						disabled={addTask.isPending || !title.trim()}
						className="rounded-xl border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] transition hover:bg-[rgba(79,184,178,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
					>
						{addTask.isPending ? "Adding…" : "Add task"}
					</button>
				</form>

				<ul className="m-0 list-none space-y-2 p-0">
					{taskList.map((task) => (
						<li
							key={task.id}
							className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white/40 px-4 py-3 dark:bg-white/5"
						>
							<span className="min-w-0 truncate text-sm font-medium text-[var(--sea-ink)]">
								{task.title}
							</span>
							<StatusChip status={task.status} />
						</li>
					))}
					{taskList.length === 0 && (
						<li className="rounded-xl border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm text-[var(--sea-ink-soft)]">
							No tasks yet — add one above to watch the worker process it.
						</li>
					)}
				</ul>
			</section>
		</main>
	);
}
