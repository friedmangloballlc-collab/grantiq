import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized } from "@/lib/cron/auth";

// ---------------------------------------------------------------------------
// GET /api/cron/check-urls  (Vercel Cron weekly on Monday at 08:00 UTC)
// HEAD-checks a batch of 50 grant URLs, nullifies broken links, and updates
// redirected URLs to their final destination.
// ---------------------------------------------------------------------------

const BATCH_SIZE = 50;
const REQUEST_TIMEOUT_MS = 2_000;

interface UrlCheckResult {
  id: string;
  originalUrl: string;
  status: "ok" | "broken" | "redirected" | "error";
  finalUrl?: string;
}

/** HEAD-check a single URL with a 2-second timeout. */
async function checkUrl(
  id: string,
  url: string
): Promise<UrlCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });

    // 404 or 410 -- link is dead
    if (res.status === 404 || res.status === 410) {
      return { id, originalUrl: url, status: "broken" };
    }

    // Check if we were redirected to a different URL
    const finalUrl = res.url;
    if (finalUrl && finalUrl !== url) {
      return { id, originalUrl: url, status: "redirected", finalUrl };
    }

    return { id, originalUrl: url, status: "ok" };
  } catch {
    // Network errors, timeouts, DNS failures
    return { id, originalUrl: url, status: "error" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const supabase = createAdminClient();

  try {
    // -----------------------------------------------------------------------
    // 1. Grab a batch of active grants that have a non-null URL.
    //    Order by last_verified (nulls first) so the least-recently-checked
    //    URLs get priority. grant_sources does not have an updated_at
    //    column — last_verified is the canonical "when did we last touch
    //    this" timestamp and is set by the verifier pipeline.
    // -----------------------------------------------------------------------
    const { data: grants, error: fetchError } = await supabase
      .from("grant_sources")
      .select("id, url")
      .eq("is_active", true)
      .not("url", "is", null)
      .order("last_verified", { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      logger.error("check-urls: fetch batch failed", {
        error: fetchError.message,
      });
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      );
    }

    if (!grants || grants.length === 0) {
      return NextResponse.json({
        success: true,
        checked: 0,
        broken: 0,
        redirected: 0,
        message: "No grants with URLs to check",
      });
    }

    // -----------------------------------------------------------------------
    // 2. HEAD-check all URLs in parallel
    // -----------------------------------------------------------------------
    const results = await Promise.all(
      (grants as { id: string; url: string }[]).map((g) =>
        checkUrl(g.id, g.url)
      )
    );

    let broken = 0;
    let redirected = 0;

    // -----------------------------------------------------------------------
    // 3. Apply fixes based on results
    // -----------------------------------------------------------------------
    for (const r of results) {
      if (r.status === "broken") {
        const { error } = await supabase
          .from("grant_sources")
          .update({ url: null })
          .eq("id", r.id);

        if (error) {
          logger.warn("check-urls: failed to null broken URL", {
            id: r.id,
            error: error.message,
          });
        } else {
          broken++;
        }
      } else if (r.status === "redirected" && r.finalUrl) {
        const { error } = await supabase
          .from("grant_sources")
          .update({ url: r.finalUrl })
          .eq("id", r.id);

        if (error) {
          logger.warn("check-urls: failed to update redirected URL", {
            id: r.id,
            error: error.message,
          });
        } else {
          redirected++;
        }
      }
    }

    // -----------------------------------------------------------------------
    // 4. Return summary
    // -----------------------------------------------------------------------
    const summary = {
      success: true,
      duration_ms: Date.now() - started,
      checked: results.length,
      ok: results.filter((r) => r.status === "ok").length,
      broken,
      redirected,
      errors: results.filter((r) => r.status === "error").length,
    };

    logger.info("URL check complete", summary);
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("URL check failed", { error: message });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
