import { Resend } from "resend";
import { render } from "@react-email/render";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST_SIGNUP_SEQUENCE } from "./sequences/post-signup";
import { RE_ENGAGEMENT_SEQUENCE } from "./sequences/re-engagement";

// Templates
import { Welcome } from "@/emails/welcome";
import { ReadinessNudge } from "@/emails/readiness-nudge";
import { ReadinessResult } from "@/emails/readiness-result";
import { DiscoveryStory } from "@/emails/discovery-story";
import { CalendarIntro } from "@/emails/calendar-intro";
import { WritingIntro } from "@/emails/writing-intro";
import { FullConfidence } from "@/emails/full-confidence";
import { TrialEnding } from "@/emails/trial-ending";
import { NewMatches } from "@/emails/new-matches";
import { DeadlineWarning } from "@/emails/deadline-warning";
import { HonestCheck } from "@/emails/honest-check";
import { FinalOffer } from "@/emails/final-offer";

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.grantaq.com";
const FROM_ADDRESS = "GrantAQ <hello@mail.grantaq.com>";

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function formatAmount(min: number | null, max: number | null): string {
  if (!min && !max) return "Amount varies";
  const fmt = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `$${Math.round(n / 1_000)}K`
    : `$${n.toLocaleString()}`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  return `From ${fmt(min!)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(dateStr: string): number {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

// ── User context fetched once per user ────────────────────────────────────────

interface UserContext {
  userId: string;
  email: string;
  displayName: string;
  orgId: string;
  orgName: string;
  signedUpAt: string;
  lastActivityAt: string | null;
  readinessScore: number | null;
  readinessComplete: boolean;
  matchCount: number;
  pipelineCount: number;
  topBlocker: string | null;
}

async function fetchUserContext(userId: string): Promise<UserContext | null> {
  const supabase = createAdminClient();

  // Auth record
  const { data: authData } = await supabase.auth.admin.getUserById(userId);
  if (!authData?.user?.email) return null;

  const email = authData.user.email;
  const displayName =
    (authData.user.user_metadata?.full_name as string | undefined) ?? email.split("@")[0];
  const signedUpAt = authData.user.created_at;

  // Org membership
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!membership) return null;
  const orgId = membership.org_id;

  // Org name
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();
  const orgName = org?.name ?? "Your Organization";

  // Last activity from user_events
  const { data: lastEvent } = await supabase
    .from("user_events")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const lastActivityAt = lastEvent?.created_at ?? null;

  // Readiness score
  const { data: readiness } = await supabase
    .from("readiness_scores")
    .select("overall_score, is_complete")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const readinessScore = readiness?.overall_score ?? null;
  const readinessComplete = readiness?.is_complete ?? false;

  // Grant match count
  const { count: matchCount } = await supabase
    .from("grant_matches")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  // Pipeline count
  const { count: pipelineCount } = await supabase
    .from("grant_pipeline")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .not("stage", "in", '("awarded","declined")');

  // Top blocker from org_capabilities
  const { data: caps } = await supabase
    .from("org_capabilities")
    .select("has_501c3, has_ein, has_audit, has_sam_registration")
    .eq("org_id", orgId)
    .single();

  let topBlocker: string | null = null;
  if (caps) {
    const blockers: Array<[boolean | null, string]> = [
      [caps.has_501c3, "Upload your 501(c)(3) determination letter to unlock federal grant eligibility."],
      [caps.has_ein, "Add your EIN documentation to complete your funding profile."],
      [caps.has_audit, "A financial audit on file expands access to larger foundation grants."],
      [caps.has_sam_registration, "SAM.gov registration is required for most federal opportunities."],
    ];
    topBlocker = blockers.find(([val]) => !val)?.[1] ?? null;
  }

  return {
    userId,
    email,
    displayName,
    orgId,
    orgName,
    signedUpAt,
    lastActivityAt,
    readinessScore,
    readinessComplete,
    matchCount: matchCount ?? 0,
    pipelineCount: pipelineCount ?? 0,
    topBlocker,
  };
}

// ── Dedup check ────────────────────────────────────────────────────────────────

async function wasAlreadySent(userId: string, template: string, sequenceType: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("notifications_log")
    .select("id")
    .eq("user_id", userId)
    .eq("notification_type", "sequence_email")
    .contains("content_snapshot", { template, sequence: sequenceType })
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function logSent(userId: string, orgId: string, template: string, sequenceType: string, subject: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("notifications_log").insert({
    user_id: userId,
    org_id: orgId,
    notification_type: "sequence_email",
    channel: "email",
    content_snapshot: {
      template,
      sequence: sequenceType,
      subject,
      sent_at: new Date().toISOString(),
    },
  });
}

// ── Template rendering ─────────────────────────────────────────────────────────

async function renderTemplate(template: string, ctx: UserContext): Promise<{ html: string; subject: string } | null> {
  const base = { appBaseUrl: APP_BASE_URL };

  switch (template) {
    case "welcome":
      return {
        subject: "Your GrantAQ account is ready — start here",
        html: await render(Welcome({ userName: ctx.displayName, orgName: ctx.orgName, ...base })),
      };

    case "readiness_nudge":
      return {
        subject: "The one thing most grant seekers skip",
        html: await render(ReadinessNudge({ userName: ctx.displayName, orgName: ctx.orgName, ...base })),
      };

    case "readiness_result": {
      if (ctx.readinessScore === null) return null; // score not available yet, skip
      return {
        subject: "Your readiness score is in — here's what it means",
        html: await render(ReadinessResult({
          userName: ctx.displayName,
          orgName: ctx.orgName,
          readinessScore: ctx.readinessScore,
          qualifiedGrantCount: ctx.matchCount,
          topBlocker: ctx.topBlocker ?? undefined,
          ...base,
        })),
      };
    }

    case "discovery_story":
      return {
        subject: "How organizations like yours find grants they never knew existed",
        html: await render(DiscoveryStory({
          userName: ctx.displayName,
          orgName: ctx.orgName,
          newMatchCount: ctx.matchCount,
          ...base,
        })),
      };

    case "calendar_intro":
      return {
        subject: "The grant calendar problem (and how to solve it in 10 minutes)",
        html: await render(CalendarIntro({
          userName: ctx.displayName,
          orgName: ctx.orgName,
          upcomingDeadlineCount: ctx.pipelineCount,
          ...base,
        })),
      };

    case "writing_intro":
      return {
        subject: "Ready to write? Here's how the AI Writing Engine works",
        html: await render(WritingIntro({ userName: ctx.displayName, orgName: ctx.orgName, ...base })),
      };

    case "full_confidence":
      return {
        subject: "One option worth knowing about: $0 upfront, 10% if you win",
        html: await render(FullConfidence({ userName: ctx.displayName, orgName: ctx.orgName, ...base })),
      };

    case "trial_ending":
      return {
        subject: "Your free trial ends in 48 hours — here's what you've built",
        html: await render(TrialEnding({
          userName: ctx.displayName,
          orgName: ctx.orgName,
          matchCount: ctx.matchCount,
          pipelineCount: ctx.pipelineCount,
          readinessScore: ctx.readinessScore ?? undefined,
          ...base,
        })),
      };

    case "new_matches": {
      const supabase = createAdminClient();
      const { data: rawMatches } = await supabase
        .from("grant_matches")
        .select(`id, match_score, last_computed, grant_sources ( id, name, funder_name, amount_min, amount_max, deadline )`)
        .eq("org_id", ctx.orgId)
        .gte("last_computed", new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString())
        .order("match_score", { ascending: false })
        .limit(3);

      const topMatches = (rawMatches ?? [])
        .filter((m) => m.grant_sources)
        .map((m) => {
          const gs = m.grant_sources as { id: string; name: string; funder_name: string; amount_min: number | null; amount_max: number | null; deadline: string | null };
          return {
            id: gs.id,
            name: gs.name,
            funder: gs.funder_name,
            score: Math.round(m.match_score),
            amount: formatAmount(gs.amount_min, gs.amount_max),
            deadline: gs.deadline ? formatDate(gs.deadline) : "Rolling",
          };
        });

      if (topMatches.length === 0) return null; // nothing to show, skip

      return {
        subject: `You have ${topMatches.length} new grant match${topMatches.length !== 1 ? "es" : ""} since you last visited`,
        html: await render(NewMatches({
          userName: ctx.displayName,
          orgName: ctx.orgName,
          newMatchCount: topMatches.length,
          topMatches,
          ...base,
        })),
      };
    }

    case "deadline_warning": {
      const supabase = createAdminClient();
      const now = new Date().toISOString();
      const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: pipelines } = await supabase
        .from("grant_pipeline")
        .select(`id, deadline, grant_sources ( id, name, funder_name, amount_min, amount_max )`)
        .eq("org_id", ctx.orgId)
        .gte("deadline", now)
        .lte("deadline", thirtyDaysOut)
        .not("stage", "in", '("submitted","awarded","declined")')
        .order("deadline")
        .limit(1);

      if (!pipelines?.length || !pipelines[0].grant_sources) {
        // Fall back to a top match deadline
        const { data: topMatch } = await supabase
          .from("grant_matches")
          .select(`match_score, grant_sources ( id, name, funder_name, amount_min, amount_max, deadline )`)
          .eq("org_id", ctx.orgId)
          .gte("grant_sources.deadline", now)
          .lte("grant_sources.deadline", thirtyDaysOut)
          .order("match_score", { ascending: false })
          .limit(1)
          .single();

        if (!topMatch?.grant_sources) return null;
        const gs = topMatch.grant_sources as { id: string; name: string; funder_name: string; amount_min: number | null; amount_max: number | null; deadline: string | null };
        if (!gs.deadline) return null;

        return {
          subject: "A deadline you should know about",
          html: await render(DeadlineWarning({
            userName: ctx.displayName,
            orgName: ctx.orgName,
            grantName: gs.name,
            funderName: gs.funder_name,
            daysUntilDeadline: daysUntil(gs.deadline),
            deadlineDate: formatDate(gs.deadline),
            grantAmount: formatAmount(gs.amount_min, gs.amount_max),
            grantId: gs.id,
            ...base,
          })),
        };
      }

      const pipeline = pipelines[0];
      const gs = pipeline.grant_sources as { id: string; name: string; funder_name: string; amount_min: number | null; amount_max: number | null };
      return {
        subject: "A deadline you should know about",
        html: await render(DeadlineWarning({
          userName: ctx.displayName,
          orgName: ctx.orgName,
          grantName: gs.name,
          funderName: gs.funder_name,
          daysUntilDeadline: daysUntil(pipeline.deadline!),
          deadlineDate: formatDate(pipeline.deadline!),
          grantAmount: formatAmount(gs.amount_min, gs.amount_max),
          grantId: gs.id,
          ...base,
        })),
      };
    }

    case "honest_check":
      return {
        subject: "Is GrantAQ a fit for where you are right now?",
        html: await render(HonestCheck({ userName: ctx.displayName, orgName: ctx.orgName, ...base })),
      };

    case "final_offer":
      return {
        subject: "Before you go — one last thing",
        html: await render(FinalOffer({ userName: ctx.displayName, orgName: ctx.orgName, ...base })),
      };

    default:
      console.warn(`[sequence] Unknown template: ${template}`);
      return null;
  }
}

// ── Condition checks ───────────────────────────────────────────────────────────

function meetsCondition(condition: string | undefined, ctx: UserContext): boolean {
  if (!condition) return true;
  switch (condition) {
    case "readiness_not_complete":
      return !ctx.readinessComplete;
    case "readiness_complete":
      return ctx.readinessComplete;
    default:
      return true;
  }
}

// ── Main entry point ───────────────────────────────────────────────────────────

export async function checkAndSendSequenceEmails(): Promise<void> {
  const supabase = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  console.log("[sequence] Starting sequence email check");

  // Fetch all active users with email access
  const { data: users, error } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("status", "active");

  if (error) {
    console.error("[sequence] Failed to fetch org_members:", error.message);
    return;
  }

  if (!users?.length) {
    console.log("[sequence] No active users found");
    return;
  }

  // Deduplicate user IDs
  const userIds = [...new Set(users.map((u) => u.user_id))] as string[];
  console.log(`[sequence] Checking ${userIds.length} user(s)`);

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const userId of userIds) {
    try {
      const ctx = await fetchUserContext(userId);
      if (!ctx) {
        skipped++;
        continue;
      }

      const daysSinceSignup = daysSince(ctx.signedUpAt);
      const daysSinceActivity = ctx.lastActivityAt ? daysSince(ctx.lastActivityAt) : daysSinceSignup;

      // ── Post-signup sequence ─────────────────────────────────────────
      for (const email of POST_SIGNUP_SEQUENCE) {
        // Only send if we're on or past the scheduled day
        if (daysSinceSignup < email.day) continue;

        // Check condition
        if (!meetsCondition(email.condition, ctx)) continue;

        // Dedup — already sent?
        const alreadySent = await wasAlreadySent(userId, email.template, "post_signup");
        if (alreadySent) continue;

        // Render
        const rendered = await renderTemplate(email.template, ctx);
        if (!rendered) {
          skipped++;
          continue;
        }

        // Send
        await resend.emails.send({
          from: FROM_ADDRESS,
          to: ctx.email,
          subject: rendered.subject,
          html: rendered.html,
        });

        await logSent(userId, ctx.orgId, email.template, "post_signup", rendered.subject);
        console.log(`[sequence] post_signup/${email.template} → ${ctx.email}`);
        sent++;

        // Only send one post-signup email per run per user to avoid flooding
        break;
      }

      // ── Re-engagement sequence ───────────────────────────────────────
      // Only triggers after 21+ days of inactivity
      if (daysSinceActivity >= 21) {
        for (const email of RE_ENGAGEMENT_SEQUENCE) {
          if (daysSinceActivity < email.day) continue;

          const alreadySent = await wasAlreadySent(userId, email.template, "re_engagement");
          if (alreadySent) continue;

          const rendered = await renderTemplate(email.template, ctx);
          if (!rendered) {
            skipped++;
            continue;
          }

          await resend.emails.send({
            from: FROM_ADDRESS,
            to: ctx.email,
            subject: rendered.subject,
            html: rendered.html,
          });

          await logSent(userId, ctx.orgId, email.template, "re_engagement", rendered.subject);
          console.log(`[sequence] re_engagement/${email.template} → ${ctx.email}`);
          sent++;

          // One re-engagement email per run per user
          break;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[sequence] Error processing user ${userId}:`, message);
      errors++;
    }
  }

  console.log(`[sequence] Complete — sent: ${sent}, skipped: ${skipped}, errors: ${errors}`);
}
