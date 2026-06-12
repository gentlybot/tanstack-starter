// Standalone worker process: `npm run worker`.
// Registers one handler per queue and waits for jobs.

import "./load-env.ts";

import { work } from "./boss.ts";
import { processTask } from "./handlers/process-task.ts";
import type { ProcessTaskPayload } from "./queues.ts";
import { PROCESS_TASK } from "./queues.ts";

async function main() {
	await work<ProcessTaskPayload>(PROCESS_TASK, processTask);
	console.log("[worker] ready — waiting for jobs");
}

main().catch((error) => {
	console.error("[worker] failed to start", error);
	process.exit(1);
});
