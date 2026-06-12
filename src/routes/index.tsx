import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: App });

const FEATURES = [
	[
		"Type-Safe Full Stack",
		"File-based routes, typed links, and server functions — one type system from DB to UI.",
	],
	[
		"Postgres + Drizzle",
		"A real database with a typed schema. Add a table, push it, query it.",
	],
	[
		"Background Jobs",
		"pg-boss rides on the same Postgres — enqueue from a server function, process in the worker.",
	],
	[
		"AI Chat Built In",
		"Streaming chat with tool calling via TanStack AI. Add a key and it talks to your data.",
	],
] as const;

function App() {
	return (
		<main className="page-wrap px-4 pb-8 pt-14">
			<section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
				<div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
				<div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
				<p className="island-kicker mb-3">TanStack Starter</p>
				<h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
					A full-stack foundation, ready to grow.
				</h1>
				<p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
					TanStack Start with a database, background jobs, and AI chat already
					wired together. Every pattern you need to build on is demonstrated
					once — cleanly — so you (or your agent) can extend it with confidence.
				</p>
				<div className="flex flex-wrap gap-3">
					<Link
						to="/tasks"
						className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
					>
						Tasks Demo
					</Link>
					<Link
						to="/chat"
						className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
					>
						AI Chat
					</Link>
				</div>
			</section>

			<section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{FEATURES.map(([title, desc], index) => (
					<article
						key={title}
						className="island-shell feature-card rise-in rounded-2xl p-5"
						style={{ animationDelay: `${index * 90 + 80}ms` }}
					>
						<h2 className="mb-2 text-base font-semibold text-[var(--sea-ink)]">
							{title}
						</h2>
						<p className="m-0 text-sm leading-6 text-[var(--sea-ink-soft)]">
							{desc}
						</p>
					</article>
				))}
			</section>
		</main>
	);
}
