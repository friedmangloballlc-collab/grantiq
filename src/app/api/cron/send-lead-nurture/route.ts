import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

// Email templates
import { FormConfirmation } from "@/emails/form-confirmation";
import { ReportEligible } from "@/emails/report-eligible";
import { ReportConditional } from "@/emails/report-conditional";
import { ReportNotEligible } from "@/emails/report-not-eligible";
import { ReportLowConfidence } from "@/emails/report-low-confidence";
import { PostEngagementUpsell } from "@/emails/engagement-emails";
import { AnnualReDiagnostic } from "@/emails/engagement-emails";
import { ReEngagement90 } from "@/emails/engagement-emails";
import { isCronAuthorized } from "@/lib/cron/auth";
import { recordHeartbeat } from "@/lib/cron/heartbeat";

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "GrantAQ <noreply@grantaq.com>";
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://grantaq.com";
const CALENDAR_URL = process.env.CALENDLY_URL ?? `${APP_BASE_URL}/contact`;

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const db = createAdminClient();
  const now = new Date();
  let sent = 0;
  let errors = 0;

  try {
    // Fetch leads with active nurture sequences
    const { data: leads } = await db
      .from("leads")
      .select("*")
      .eq("nurture_status", "active")
      .not("nurture_sequence", "is", null);

    if (!leads || leads.length === 0) {
      const __summary = { success: true, sent: 0, message: "No pending emails" };
      await recordHeartbeat({ cronName: "send-lead-nurture", startedAt, outcome: "ok", summary: __summary });
      return NextResponse.json(__summary);
    }

    for (const lead of leads) {
      const sequence = lead.nurture_sequence as Array<{ day: number; send_at: string; sent?: boolean }>;
      if (!sequence) continue;

      const firstName = (lead.full_name as string)?.split(" ")[0] ?? (lead.email as string).split("@")[0];
      const companyName = (lead.company_name as string) ?? "Your Organization";

      for (const step of sequence) {
        // Skip already sent
        if (step.sent) continue;

        // Check if it's time to send
        if (new Date(step.send_at) > now) continue;

        try {
          const html = await renderNurtureEmail(step.day, {
            firstName,
            companyName,
            email: lead.email as string,
            verdict: (lead.report_verdict as string) ?? "not_eligible",
            score: (lead.report_score as number) ?? 0,
            universeLow: lead.report_universe_low as number,
            universeHigh: lead.report_universe_high as number,
            intakeData: lead.intake_data as Record<string, unknown>,
          });

          if (!html) {
            step.sent = true;
            continue;
          }

          const subject = getNurtureSubject(step.day, firstName, companyName, lead);

          await resend.emails.send({
            from: FROM_ADDRESS,
            to: lead.email as string,
            subject,
            html,
          });

          step.sent = true;
          sent++;
          logger.info("Nurture email sent", { email: lead.email, day: step.day });
        } catch (err) {
          errors++;
          logger.error("Nurture email failed", { email: lead.email, day: step.day, error: String(err) });
        }
      }

      // Update sequence with sent flags
      const allSent = sequence.every((s) => s.sent);
      await db
        .from("leads")
        .update({
          nurture_sequence: sequence,
          nurture_status: allSent ? "completed" : "active",
        })
        .eq("id", lead.id);
    }

    const __summary = { success: true, sent, errors, leadsProcessed: leads.length };
    await recordHeartbeat({ cronName: "send-lead-nurture", startedAt, outcome: errors > 0 && sent > 0 ? "partial" : errors > 0 ? "error" : "ok", summary: __summary });
    return NextResponse.json(__summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Lead nurture cron failed", { error: message });
    await recordHeartbeat({ cronName: "send-lead-nurture", startedAt, outcome: "error", errorMessage: message });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function getNurtureSubject(day: number, firstName: string, companyName: string, lead: Record<string, unknown>): string {
  switch (day) {
    case 2: return `3 Quick Wins You Can Do This Week, ${firstName}`;
    case 5: return `How businesses like ${companyName} get grant-ready in 90 days`;
    case 10: return `${firstName}, your grant universe is waiting`;
    case 21: return "Still thinking about grants?";
    default: return "Grant Readiness Update";
  }
}

interface NurtureContext {
  firstName: string;
  companyName: string;
  email: string;
  verdict: string;
  score: number;
  universeLow: number;
  universeHigh: number;
  intakeData: Record<string, unknown>;
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

async function renderNurtureEmail(day: number, ctx: NurtureContext): Promise<string | null> {
  switch (day) {
    case 2: {
      // Quick wins email — pull from intake data
      const { QuickWinsEmail } = await import("@/emails/nurture-quick-wins");
      return render(QuickWinsEmail({ firstName: ctx.firstName, companyName: ctx.companyName, verdict: ctx.verdict, score: ctx.score, appBaseUrl: APP_BASE_URL }));
    }
    case 5: {
      const { SocialProofEmail } = await import("@/emails/nurture-social-proof");
      return render(SocialProofEmail({ firstName: ctx.firstName, companyName: ctx.companyName, appBaseUrl: APP_BASE_URL }));
    }
    case 10: {
      const { OpportunityCostEmail } = await import("@/emails/nurture-opportunity-cost");
      return render(OpportunityCostEmail({
        firstName: ctx.firstName,
        grantUniverseLow: formatCurrency(ctx.universeLow),
        grantUniverseHigh: formatCurrency(ctx.universeHigh),
        appBaseUrl: APP_BASE_URL,
        calendarUrl: CALENDAR_URL,
      }));
    }
    case 21: {
      return render(ReEngagement90({
        firstName: ctx.firstName,
        companyName: ctx.companyName,
        appBaseUrl: APP_BASE_URL,
        calendarUrl: CALENDAR_URL,
      }));
    }
    default:
      return null;
  }
}
