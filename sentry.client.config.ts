import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of transactions — enough for insights, cheap
  replaysSessionSampleRate: 0, // No session replay on free tier
  replaysOnErrorSampleRate: 0.5, // 50% of errors get a replay
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
