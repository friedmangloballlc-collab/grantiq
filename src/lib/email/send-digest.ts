import { Resend } from "resend";
import { render } from "@react-email/render";
import { createAdminClient } from "@/lib/supabase/admin";
import { WeeklyDigest } from "@/emails/weekly-digest";
import type {
  DigestMatch,
  DigestDeadline,
  ActionItem,
} from "@/emails/weekly-digest";

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.grantaq.com";

function formatAmount(min: number | null, max: number | null): string {
  if (!min && !max) return "Amount varies";
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `$${Math.round(n / 1_000)}K`
      : `$${n.toLocaleString()}`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  return `From ${fmt(min!)}`;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function daysSince(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.floor((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface OrgDigestData {
  orgId: string;
  orgName: string;
  userName: string;
  userEmail: string;
  newMatches: DigestMatch[];
  upcomingDeadlines: DigestDeadline[];
  actionItem: ActionItem;
}

async function fetchDigestData(orgId: string, _userId: string): Promise<Omit<OrgDigestData, "orgId" | "userName" | "userEmail">> {
  const supabase = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysOut = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  // Fetch org name
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();

  const orgName = org?.name ?? "Your Organization";

  // Fetch new matches from last 7 days
  const { data: rawMatches } = await supabase
    .from("grant_matches")
    .select(`
      id,
      match_score,
      last_computed,
      grant_sources (
        id,
        name,
        funder_name,
        amount_min,
        amount_max,
        deadline,
        url
      )
    `)
    .eq("org_id", orgId)
    .gte("last_computed", weekAgo)
    .order("match_score", { ascending: false })
    .limit(5);

  const newMatches: DigestMatch[] = (rawMatches ?? [])
    .filter((m) => m.grant_sources)
    .map((m) => {
      const gs = m.grant_sources as {
        id: string;
        name: string;
        funder_name: string;
        amount_min: number | null;
        amount_max: number | null;
        deadline: string | null;
        url: string | null;
      };
      return {
        id: gs.id,
        name: gs.name,
        funder: gs.funder_name,
        score: Math.round(m.match_score),
        amount: formatAmount(gs.amount_min, gs.amount_max),
        deadline: gs.deadline ? formatDate(gs.deadline) : "Rolling",
        url: gs.url ?? `${APP_BASE_URL}/grants/${gs.id}`,
      };
    });

  // Fetch pipeline deadlines in next 14 days
  const { data: rawDeadlines } = await supabase
    .from("grant_pipeline")
    .select(`
      id,
      deadline,
      stage,
      updated_at,
      grant_sources (
        name
      )
    `)
    .eq("org_id", orgId)
    .lte("deadline", fourteenDaysOut)
    .gte("deadline", now)
    .not("stage", "in", '("submitted","awarded","declined")')
    .order("deadline")
    .limit(10);

  const upcomingDeadlines: DigestDeadline[] = (rawDeadlines ?? [])
    .filter((d) => d.grant_sources)
    .map((d) => {
      const gs = d.grant_sources as { name: string };
      return {
        id: d.id,
        name: gs.name,
        deadline: formatDate(d.deadline!),
        daysLeft: daysUntil(d.deadline!),
        stage: d.stage,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Determine the single best action item (priority order)
  let actionItem: ActionItem = { type: "none" };

  // 1. Check for high-score unreviewed match
  const topUnreviewed = (rawMatches ?? []).find((m) => m.match_score >= 85);
  if (topUnreviewed && topUnreviewed.grant_sources) {
    const gs = topUnreviewed.grant_sources as { id: string; name: string };
    actionItem = {
      type: "unreviewed_match",
      grantName: gs.name,
      score: Math.round(topUnreviewed.match_score),
      grantId: gs.id,
    };
  }

  // 2. Check for stale pipeline (staleness takes priority over unreviewed matches)
  const { data: staleItems } = await supabase
    .from("grant_pipeline")
    .select(`
      id,
      updated_at,
      grant_sources (
        name
      )
    `)
    .eq("org_id", orgId)
    .not("stage", "in", '("submitted","awarded","declined")')
    .lt("updated_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
    .order("updated_at")
    .limit(1);

  if (staleItems?.length && staleItems[0].grant_sources) {
    const gs = staleItems[0].grant_sources as { name: string };
    actionItem = {
      type: "stale_pipeline",
      grantName: gs.name,
      daysSinceUpdate: daysSince(staleItems[0].updated_at),
      pipelineId: staleItems[0].id,
    };
  }

  // 3. Check for missing org capabilities (missing docs)
  const { data: caps } = await supabase
    .from("org_capabilities")
    .select("has_501c3, has_ein, has_audit, has_sam_registration")
    .eq("org_id", orgId)
    .single();

  if (caps) {
    const missingDocMap: Array<[boolean | null, string, number]> = [
      [caps.has_501c3, "501(c)(3) determination letter", 12],
      [caps.has_ein, "EIN documentation", 8],
      [caps.has_audit, "financial audit", 6],
      [caps.has_sam_registration, "SAM.gov registration", 5],
    ];
    const missing = missingDocMap.find(([val]) => !val);
    if (missing) {
      actionItem = {
        type: "missing_docs",
        docName: missing[1] as string,
        grantsUnlocked: missing[2] as number,
      };
    }
  }

  return { orgName, newMatches, upcomingDeadlines, actionItem };
}

/**
 * Sends the weekly digest email for a single org/user pair.
 */
export async function sendWeeklyDigest(orgId: string, userEmail: string, userId: string, userName?: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { orgName, newMatches, upcomingDeadlines, actionItem } = await fetchDigestData(orgId, userId);

  // Skip if nothing useful to show
  if (newMatches.length === 0 && upcomingDeadlines.length === 0 && actionItem.type === "none") {
    console.log(`[digest] Skipping ${userEmail} — nothing to report for org ${orgId}`);
    return;
  }

  const displayName = userName ?? userEmail.split("@")[0];
  const settingsUrl = `${APP_BASE_URL}/settings#notifications`;
  const unsubscribeUrl = `${APP_BASE_URL}/settings#notifications`;

  const html = await render(
    WeeklyDigest({
      orgName,
      userName: displayName,
      newMatches,
      upcomingDeadlines,
      actionItem,
      appBaseUrl: APP_BASE_URL,
      settingsUrl,
      unsubscribeUrl,
    })
  );

  const matchCount = newMatches.length;
  const deadlineCount = upcomingDeadlines.length;
  const subjectParts: string[] = [];
  if (matchCount > 0) subjectParts.push(`${matchCount} new match${matchCount > 1 ? "es" : ""}`);
  if (deadlineCount > 0) subjectParts.push(`${deadlineCount} deadline${deadlineCount > 1 ? "s" : ""} coming up`);
  const subject = subjectParts.length > 0
    ? `GrantAQ Digest: ${subjectParts.join(" · ")}`
    : "Your GrantAQ Weekly Digest";

  await resend.emails.send({
    from: "GrantAQ <digest@mail.grantaq.com>",
    to: userEmail,
    subject,
    html,
  });

  console.log(`[digest] Sent to ${userEmail}: ${matchCount} matches, ${deadlineCount} deadlines`);
}
