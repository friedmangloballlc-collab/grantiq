// grantiq/src/app/api/triage/support/route.ts
//
// Inbound endpoint for Agent #12 (Support Triage). Accepts a
// normalized support-message payload from any source — email parser,
// Intercom webhook, or the in-app contact form. Guarded by
// SUPPORT_WEBHOOK_SECRET via X-Triage-Secret header.

import { NextRequest, NextResponse } from "next/server";
import { triageSupportMessage } from "@/lib/ai/agents/support-triage";
import { logger } from "@/lib/logger";
import type {
  SupportChannel,
  SupportTriageInput,
} from "@/lib/ai/agents/support-triage/types";

const VALID_CHANNELS: SupportChannel[] = [
  "email",
  "intercom",
  "in_app",
  "manual",
];

interface IncomingPayload {
  channel?: string;
  external_id?: string | null;
  sender_email?: string | null;
  sender_name?: string | null;
  subject?: string | null;
  body?: string;
  org_id?: string | null;
  user_id?: string | null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.SUPPORT_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SUPPORT_WEBHOOK_SECRET not configured" },
      { status: 503 }
    );
  }

  const headerSecret = req.headers.get("x-triage-secret");
  if (headerSecret !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: IncomingPayload;
  try {
    raw = (await req.json()) as IncomingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!raw.body || raw.body.trim().length < 5) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const channel: SupportChannel = VALID_CHANNELS.includes(
    raw.channel as SupportChannel
  )
    ? (raw.channel as SupportChannel)
    : "manual";

  const triageInput: SupportTriageInput = {
    channel,
    externalId: raw.external_id ?? null,
    senderEmail: raw.sender_email ?? null,
    senderName: raw.sender_name ?? null,
    subject: raw.subject ?? null,
    body: raw.body,
    orgId: raw.org_id ?? null,
    userId: raw.user_id ?? null,
    tier: "internal",
  };

  try {
    const result = await triageSupportMessage(triageInput);

    logger.info("support.triage webhook processed", {
      intent: result.intent,
      urgency: result.urgency,
      verdict: result.verdict,
    });

    return NextResponse.json({
      ok: true,
      verdict: result.verdict,
      ticket_id: result.ticketId,
    });
  } catch (err) {
    logger.error("support.triage webhook error", { err: String(err) });
    return NextResponse.json({ error: "Triage failed" }, { status: 500 });
  }
}
