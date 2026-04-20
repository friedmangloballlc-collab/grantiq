// grantiq/src/app/api/triage/sentry/route.ts
//
// Inbound webhook for Sentry issue events → Agent #10 (Sentry Triage).
//
// Sentry's service hook pushes a JSON body that includes the issue
// payload. We extract title/message/culprit/stack and pass to the
// triager, which classifies + persists. This endpoint is shared-secret
// guarded; set SENTRY_WEBHOOK_SECRET in Vercel and configure the hook
// to send it as the "X-Triage-Secret" header.
//
// Not gated on Sentry signature verification yet — shared-secret is
// sufficient for v1 because Sentry's signature scheme requires the
// raw body and a per-project secret we haven't configured. Upgrade
// to real signature verification before Sentry exposes webhooks to
// anything untrusted.

import { NextRequest, NextResponse } from "next/server";
import { triageError } from "@/lib/ai/agents/sentry-triage";
import { logger } from "@/lib/logger";

interface SentryHookPayload {
  event?: {
    event_id?: string;
    message?: string;
    exception?: {
      values?: Array<{
        type?: string;
        value?: string;
        stacktrace?: { frames?: Array<{ filename?: string; function?: string }> };
      }>;
    };
  };
  issue?: {
    id?: string | number;
    title?: string;
    culprit?: string;
    url?: string;
  };
}

export async function POST(req: NextRequest) {
  const secret = process.env.SENTRY_WEBHOOK_SECRET;
  if (!secret) {
    // Explicit misconfig — refuse rather than accept random POSTs.
    return NextResponse.json(
      { error: "SENTRY_WEBHOOK_SECRET not configured" },
      { status: 503 }
    );
  }

  const headerSecret = req.headers.get("x-triage-secret");
  if (headerSecret !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: SentryHookPayload;
  try {
    body = (await req.json()) as SentryHookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const externalId = body.issue?.id ? String(body.issue.id) : null;
  const title = body.issue?.title || body.event?.message || "Untitled error";
  const errorMessage =
    body.event?.exception?.values?.[0]?.value ?? body.event?.message ?? null;
  const frames = body.event?.exception?.values?.[0]?.stacktrace?.frames ?? [];
  const stackTrace =
    frames
      .slice(-10)
      .map((f) => `${f.filename ?? "?"}:${f.function ?? "?"}`)
      .join("\n") || null;

  try {
    const result = await triageError({
      source: "sentry",
      externalId,
      title,
      errorMessage,
      stackTrace,
      context: { culprit: body.issue?.culprit, url: body.issue?.url },
      orgId: null,
      userId: null,
      tier: "internal",
    });

    logger.info("sentry.triage webhook processed", {
      externalId,
      severity: result.severity,
      category: result.category,
      verdict: result.verdict,
    });

    return NextResponse.json({ ok: true, verdict: result.verdict });
  } catch (err) {
    logger.error("sentry.triage webhook error", { err: String(err) });
    return NextResponse.json({ error: "Triage failed" }, { status: 500 });
  }
}
