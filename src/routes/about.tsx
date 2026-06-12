import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
	component: About,
});

const PIECES = [
	[
		"TanStack Start",
		"SSR, file-based routing, and type-safe server functions.",
	],
	[
		"Postgres + Drizzle",
		"Typed schema in src/db/schema.ts — push it, query it.",
	],
	[
		"pg-boss jobs",
		"Background work queued in Postgres, processed by the worker.",
	],
	["TanStack AI", "Streaming chat with tool calling at /chat."],
] as const;

function About() {
	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">About</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
					A starter with room to grow.
				</h1>
				<p className="mb-8 max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
					This template wires together the pieces most apps eventually need —
					database, background jobs, AI — each demonstrated once so they're easy
					to copy and extend. The conventions live in AGENTS.md, which doubles
					as the guide for AI coding agents working in this repo.
				</p>
				<dl className="m-0 grid gap-4 sm:grid-cols-2">
					{PIECES.map(([title, desc]) => (
						<div
							key={title}
							className="rounded-xl border border-[var(--line)] bg-white/40 p-4 dark:bg-white/5"
						>
							<dt className="mb-1 text-sm font-semibold text-[var(--sea-ink)]">
								{title}
							</dt>
							<dd className="m-0 text-sm leading-6 text-[var(--sea-ink-soft)]">
								{desc}
							</dd>
						</div>
					))}
				</dl>
			</section>
		</main>
	);
}
