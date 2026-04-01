import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// GET /api/cron/validate-grants  (Vercel Cron daily at 07:00 UTC)
// Data-quality pipeline that fixes common grant_sources inconsistencies.
// ---------------------------------------------------------------------------

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = request.headers.get("x-vercel-cron-secret");
  if (cronSecret && cronSecret === process.env.CRON_SECRET) return true;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${process.env.ADMIN_SECRET}`) return true;

  return false;
}

/** Returns true if a funder_name looks invalid. */
function isInvalidFunderName(name: string | null | undefined): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (trimmed.length < 3) return true;
  if (trimmed.startsWith("$")) return true;
  if (/^\d+$/.test(trimmed)) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const supabase = createAdminClient();
  const counts = {
    expired_closed: 0,
    amount_flagged: 0,
    duplicates_deactivated: 0,
    invalid_funder_deactivated: 0,
  };

  try {
    // -----------------------------------------------------------------------
    // 1. Close grants with past deadlines still marked active
    // -----------------------------------------------------------------------
    const today = new Date().toISOString().split("T")[0];

    const { data: pastDeadline, error: pdError } = await supabase
      .from("grant_sources")
      .update({ is_active: false, status: "closed" })
      .eq("is_active", true)
      .lt("deadline", today)
      .not("deadline", "is", null)
      .select("id");

    if (pdError) {
      logger.error("validate: expire past-deadline failed", {
        error: pdError.message,
      });
    } else {
      counts.expired_closed = pastDeadline?.length ?? 0;
    }

    // -----------------------------------------------------------------------
    // 2. Flag grants where amount_max < amount_min
    // -----------------------------------------------------------------------
    // Supabase doesn't support column-to-column comparison in filters,
    // so we pull candidates and fix them in app code.
    const { data: amountGrants, error: amtError } = await supabase
      .from("grant_sources")
      .select("id, amount_min, amount_max")
      .eq("is_active", true)
      .not("amount_min", "is", null)
      .not("amount_max", "is", null);

    if (amtError) {
      logger.error("validate: amount query failed", {
        error: amtError.message,
      });
    } else if (amountGrants) {
      const bad = amountGrants.filter(
        (g: { amount_min: number; amount_max: number }) =>
          g.amount_max < g.amount_min
      );

      if (bad.length > 0) {
        // Swap min and max so the data makes sense
        for (const g of bad) {
          await supabase
            .from("grant_sources")
            .update({ amount_min: g.amount_max, amount_max: g.amount_min })
            .eq("id", g.id);
        }
        counts.amount_flagged = bad.length;
      }
    }

    // -----------------------------------------------------------------------
    // 3. Deduplicate grants (same name + funder_name) -- keep newest
    // -----------------------------------------------------------------------
    // Pull all active grants grouped by name+funder. Supabase JS doesn't
    // support GROUP BY with HAVING, so we do light-weight dedup in code.
    const { data: allActive, error: dedupError } = await supabase
      .from("grant_sources")
      .select("id, name, funder_name, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (dedupError) {
      logger.error("validate: dedup query failed", {
        error: dedupError.message,
      });
    } else if (allActive) {
      const seen = new Map<string, string>(); // key -> newest id
      const toDeactivate: string[] = [];

      for (const g of allActive as {
        id: string;
        name: string;
        funder_name: string;
        created_at: string;
      }[]) {
        const key = `${(g.name ?? "").toLowerCase().trim()}::${(g.funder_name ?? "").toLowerCase().trim()}`;
        if (seen.has(key)) {
          // This is an older duplicate (results sorted newest-first)
          toDeactivate.push(g.id);
        } else {
          seen.set(key, g.id);
        }
      }

      if (toDeactivate.length > 0) {
        // Batch deactivation in chunks of 200 to stay within Supabase limits
        for (let i = 0; i < toDeactivate.length; i += 200) {
          const chunk = toDeactivate.slice(i, i + 200);
          await supabase
            .from("grant_sources")
            .update({ is_active: false, status: "archived" })
            .in("id", chunk);
        }
        counts.duplicates_deactivated = toDeactivate.length;
      }
    }

    // -----------------------------------------------------------------------
    // 4. Deactivate grants with invalid funder names
    // -----------------------------------------------------------------------
    const { data: funderGrants, error: funderError } = await supabase
      .from("grant_sources")
      .select("id, funder_name")
      .eq("is_active", true);

    if (funderError) {
      logger.error("validate: funder query failed", {
        error: funderError.message,
      });
    } else if (funderGrants) {
      const badFunder = (
        funderGrants as { id: string; funder_name: string | null }[]
      ).filter((g) => isInvalidFunderName(g.funder_name));

      if (badFunder.length > 0) {
        const ids = badFunder.map((g) => g.id);
        for (let i = 0; i < ids.length; i += 200) {
          const chunk = ids.slice(i, i + 200);
          await supabase
            .from("grant_sources")
            .update({ is_active: false })
            .in("id", chunk);
        }
        counts.invalid_funder_deactivated = badFunder.length;
      }
    }

    // -----------------------------------------------------------------------
    // 5. Return summary
    // -----------------------------------------------------------------------
    const summary = {
      success: true,
      duration_ms: Date.now() - started,
      ...counts,
    };

    logger.info("Grant validation complete", summary);
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Grant validation failed", { error: message });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
