// Queue names and payload types, shared between enqueuers (server functions)
// and the worker. Add a constant + payload type here for each new job.

export const PROCESS_TASK = 'process-task'
export type ProcessTaskPayload = { taskId: number }
