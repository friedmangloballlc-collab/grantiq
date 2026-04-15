import { Resend } from "resend";
import { render } from "@react-email/render";
import { EligibilityReport } from "@/emails/eligibility-report";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const FROM_ADDRESS = "GrantAQ <noreply@grantaq.com>";

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

/**
 * Send the eligibility report email immediately after public check.
 * Also queues the lead for the nurture sequence.
 */
export async function sendLeadReportEmail(
  email: string,
  fullName: string,
  companyName: string,
  report: Record<string, unknown>
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.error("RESEND_API_KEY not configured — skipping lead email");
    return;
  }

  const resend = new Resend(apiKey);

  const verdict = (report.verdict as string) ?? "not_eligible";
  const readinessScore = (report.readiness_score as number) ?? 0;
  const universe = report.estimated_addressable_universe as { low: number; high: number; program_count: number } | undefined;
  const quickWins = (report.quick_wins as Array<{ action: string; where: string; time: string; cost: string }>) ?? [];
  const blockers = (report.blockers as Array<{ issue: string; severity: string }>) ?? [];
  const categories = (report.eligible_categories as Array<{ category: string; status: string }>) ?? [];

  const verdictLabels: Record<string, string> = {
    eligible_now: "Eligible Now",
    conditionally_eligible: "Conditionally Eligible",
    eligible_after_remediation: "Eligible After Remediation",
    not_eligible: "Not Eligible in Current Form",
  };

  try {
    const html = await render(
      EligibilityReport({
        userName: fullName || email.split("@")[0],
        companyName,
        verdict,
        readinessScore,
        grantUniverseLow: universe ? formatCurrency(universe.low) : "$0",
        grantUniverseHigh: universe ? formatCurrency(universe.high) : "$0",
        programCount: universe?.program_count ?? 0,
        quickWins,
        topBlockers: blockers.slice(0, 5),
        eligibleCategories: categories,
      })
    );

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: `Your Grant Eligibility Report — ${verdictLabels[verdict] ?? verdict} | ${companyName}`,
      html,
    });

    logger.info("Lead report email sent", { email, verdict });

    // Queue nurture sequence — store send_at timestamps in leads table
    const db = createAdminClient();
    const nurtureDays = [2, 5, 10, 21];
    const nurtureSendDates = nurtureDays.map((d) => ({
      day: d,
      send_at: new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString(),
    }));

    await db
      .from("leads")
      .update({
        nurture_sequence: nurtureSendDates,
        nurture_status: "active",
        report_verdict: verdict,
        report_score: readinessScore,
        report_universe_low: universe?.low ?? 0,
        report_universe_high: universe?.high ?? 0,
      })
      .eq("email", email);

    logger.info("Lead nurture sequence queued", { email, emails: nurtureDays.length });
  } catch (err) {
    logger.error("Failed to send lead report email", { email, error: String(err) });
  }
}

/**
 * Send admin alert for hot leads.
 */
export async function sendHotLeadAlert(
  leadEmail: string,
  companyName: string,
  verdict: string,
  readinessScore: number,
  annualRevenue: string | null
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL ?? "getreachmediallc@gmail.com";
  if (!apiKey) return;

  const isHot = readinessScore >= 60 || ["500k_2m", "2m_10m", "10m_plus"].includes(annualRevenue ?? "");
  if (!isHot) return;

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: adminEmail,
      subject: `🔥 Hot Lead: ${companyName} — Score ${readinessScore}/100`,
      html: `
        <h2>Hot Lead Alert</h2>
        <p><strong>Company:</strong> ${companyName}</p>
        <p><strong>Email:</strong> ${leadEmail}</p>
        <p><strong>Verdict:</strong> ${verdict}</p>
        <p><strong>Readiness Score:</strong> ${readinessScore}/100</p>
        <p><strong>Revenue Range:</strong> ${annualRevenue ?? "Not provided"}</p>
        <p><a href="https://grantaq.com/admin/leads">View in Admin Panel →</a></p>
      `,
    });

    logger.info("Hot lead alert sent", { leadEmail, companyName, readinessScore });
  } catch (err) {
    logger.error("Failed to send hot lead alert", { error: String(err) });
  }
}
