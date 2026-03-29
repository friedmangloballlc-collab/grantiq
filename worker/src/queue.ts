export interface Job {
  id: string;
  jobType: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
}

export function parseJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    jobType: row.job_type as string,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    attempts: (row.attempts ?? 0) as number,
    maxAttempts: (row.max_attempts ?? 3) as number,
  };
}
