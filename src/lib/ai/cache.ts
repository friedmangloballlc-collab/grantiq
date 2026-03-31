import { createHash } from "crypto";

export function computeProfileHash(data: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 16);
}
