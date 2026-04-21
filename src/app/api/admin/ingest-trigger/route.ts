// POST /api/admin/ingest-trigger
//
// Manual trigger for the ingest crons. Useful when:
//   - Vercel cron is misconfigured and hasn't fired in days
//   - We just seeded new sources into grant_source_directory
//   - We want to catch up 525 unchecked sources faster than the
//     daily schedule allows
//   - We're debugging the cron pipeline and need fast iteration
//
// Admin-only. The same allow-list (ADMIN_EMAILS env) that gates
// cost-watchdog admin actions gates this one. The cron routes
// themselves still accept Vercel's scheduled invocation via
// x-vercel-cron-secret, so this doesn't widen any attack surface.
//
// Implementation: we import and call each cron's GET handler
// directly in-process instead of self-fetching. This avoids
// round-tripping through Vercel's proxy and means the trigger
// finishes in the same request budget the cron itself has (5 min).

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";

// Keep this list explicit — no string concatenation into a dynamic
// import path, so no route-name injection risk.
const TRIGGERS = {
  "crawl-sources": () =>
    import("@/app/api/cron/crawl-sources/route").then((m) => m.GET),
  "refresh-grants": () =>
    import("@/app/api/cron/refresh-grants/route").then((m) => m.GET),
  "ingest-990": () =>
    import("@/app/api/cron/ingest-990/route").then((m) => m.GET),
  "enrich-grants": () =>
    import("@/app/api/cron/enrich-grants/route").then((m) => m.GET),
  "validate-grants": () =>
    import("@/app/api/cron/validate-grants/route").then((m) => m.GET),
  "generate-embeddings": () =>
    import("@/app/api/cron/generate-embeddings/route").then((m) => m.GET),
} as const;

type TriggerName = keyof typeof TRIGGERS;

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    // 1. Admin auth
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Validate the requested cron name against our whitelist
    let body: { cron?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const cronName = body.cron;
    if (!cronName || !(cronName in TRIGGERS)) {
      return NextResponse.json(
        {
          error: "Invalid cron name",
          available: Object.keys(TRIGGERS),
        },
        { status: 400 }
      );
    }

    // 3. Load the cron's GET handler and call it with a synthetic
    //    request that carries the ADMIN_SECRET Bearer so the cron's
    //    isAuthorized() check passes.
    const handlerLoader = TRIGGERS[cronName as TriggerName];
    const cronHandler = await handlerLoader();

    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
      logger.error("ingest-trigger missing ADMIN_SECRET env");
      return NextResponse.json(
        { error: "Server not configured (ADMIN_SECRET missing)" },
        { status: 500 }
      );
    }

    const syntheticUrl = new URL(
      `/api/cron/${cronName}`,
      req.nextUrl.origin
    ).toString();
    const syntheticRequest = new NextRequest(syntheticUrl, {
      method: "GET",
      headers: { authorization: `Bearer ${adminSecret}` },
    });

    logger.info("ingest-trigger manual run", {
      cron: cronName,
      triggered_by: user.email,
    });

    const started = Date.now();
    const result = await cronHandler(syntheticRequest);
    const duration_ms = Date.now() - started;

    // The cron returns a NextResponse — forward its body + status
    // so the UI can show the same success/failure shape it would
    // get from a real scheduled run.
    const payload = await result.json().catch(() => ({ raw: "unparseable" }));

    return NextResponse.json({
      ok: result.ok,
      triggered: cronName,
      duration_ms,
      result: payload,
    });
  } catch (err) {
    logger.error("ingest-trigger failed", { err: String(err) });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
