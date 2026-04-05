import { logger } from "./logger";

export function reportError(error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error("Unhandled error", {
    message,
    stack: stack?.substring(0, 500),
    ...context,
  });

  // In production, this could POST to an external service
  // For now, structured logging is sufficient for Vercel logs
}
