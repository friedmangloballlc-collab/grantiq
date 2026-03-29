import { describe, it, expect } from "vitest";
import { parseJob } from "../src/queue.js";

describe("parseJob", () => {
  it("parses a job row into a typed object", () => {
    const row = {
      id: "abc-123",
      job_type: "match_grants",
      payload: { org_id: "org-456" },
      attempts: 1,
      max_attempts: 3,
    };
    const job = parseJob(row);
    expect(job.id).toBe("abc-123");
    expect(job.jobType).toBe("match_grants");
    expect(job.payload.org_id).toBe("org-456");
    expect(job.attempts).toBe(1);
    expect(job.maxAttempts).toBe(3);
  });

  it("handles missing optional fields with defaults", () => {
    const row = {
      id: "xyz",
      job_type: "weekly_digest",
    };
    const job = parseJob(row as any);
    expect(job.payload).toEqual({});
    expect(job.attempts).toBe(0);
    expect(job.maxAttempts).toBe(3);
  });
});
