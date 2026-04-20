// grantiq/src/lib/grants/funder_context.ts
//
// Unit 9a of docs/plans/2026-04-19-002-feat-grantiq-rfp-crawler-plan.md.
//
// Builds a deterministic per-grant funder context block sourced from
// existing 990 data already populated in funder_profiles. The block
// is appended to the writing pipeline's cacheable context so the AI
// has verified ground-truth funder details on every draft, even when
// the RFP itself is thin or absent.
//
// Hard rule: this function NEVER fabricates. If a funder field is
// null, it's omitted from the output entirely (no "unknown" or "0"
// placeholders that the AI could mistake for real data). If no
// funder_profiles row matches at all, the function returns null and
// the caller must skip the block entirely.

import { createAdminClient } from "@/lib/supabase/admin";

interface FunderProfileRow {
  funder_name: string;
  funder_type: string | null;
  focus_areas: string[] | null;
  avg_award_size: number | null;
  typical_award_range_min: number | null;
  typical_award_range_max: number | null;
  total_annual_giving: number | null;
  geographic_preference: Record<string, unknown> | null;
  org_size_preference: string | null;
  new_applicant_friendly: boolean | null;
  acceptance_rate: number | null;
}

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/**
 * Pulls the funder_profiles row for a grant. First tries grant_sources.funder_id
 * (FK), falls back to ilike match on funder_name. Returns null if no match
 * resolves.
 */
async function resolveFunder(
  grantSourceId: string
): Promise<FunderProfileRow | null> {
  const admin = createAdminClient();

  const { data: grant } = await admin
    .from("grant_sources")
    .select("funder_id, funder_name")
    .eq("id", grantSourceId)
    .single();

  if (!grant) return null;

  // Path 1: FK resolves cleanly
  if (grant.funder_id) {
    const { data: byId } = await admin
      .from("funder_profiles")
      .select(
        "funder_name, funder_type, focus_areas, avg_award_size, typical_award_range_min, typical_award_range_max, total_annual_giving, geographic_preference, org_size_preference, new_applicant_friendly, acceptance_rate"
      )
      .eq("id", grant.funder_id)
      .maybeSingle();
    if (byId) return byId as FunderProfileRow;
  }

  // Path 2: name fallback. Many imported grants have funder_id null but a
  // matchable funder_name. Use ilike with the bare name; if multiple match,
  // take the first (we have no better signal).
  if (grant.funder_name) {
    const { data: byName } = await admin
      .from("funder_profiles")
      .select(
        "funder_name, funder_type, focus_areas, avg_award_size, typical_award_range_min, typical_award_range_max, total_annual_giving, geographic_preference, org_size_preference, new_applicant_friendly, acceptance_rate"
      )
      .ilike("funder_name", grant.funder_name)
      .limit(1);
    if (byName && byName.length > 0) return byName[0] as FunderProfileRow;
  }

  return null;
}

/**
 * Build the human-readable context block for a grant's funder.
 *
 * Returns null if no funder_profiles row resolves OR if the resolved row
 * has no usable data (every field null). The caller MUST handle null by
 * omitting the block entirely — emitting an empty stub would create a
 * fabrication risk.
 *
 * The output is intentionally plain text (not JSON) so it reads naturally
 * in the prompt. The provenance header is included so the AI knows where
 * the data came from and won't hallucinate beyond it.
 */
export async function buildFunderContextBlock(
  grantSourceId: string
): Promise<string | null> {
  const funder = await resolveFunder(grantSourceId);
  if (!funder) return null;

  const lines: string[] = [];

  // Header — establishes provenance for the AI
  lines.push("=== FUNDER CONTEXT (FROM IRS 990 FILINGS) ===");
  lines.push(
    "The following facts about the funder come from public IRS 990 filings"
  );
  lines.push(
    "and are verified ground truth. Do not invent details beyond what's listed here."
  );
  lines.push("");

  lines.push(`Funder: ${funder.funder_name}`);

  if (funder.funder_type) {
    lines.push(`Type: ${funder.funder_type}`);
  }

  if (funder.focus_areas && funder.focus_areas.length > 0) {
    lines.push(`Focus areas (NTEE-derived): ${funder.focus_areas.join(", ")}`);
  }

  // Giving section
  const givingFacts: string[] = [];
  if (funder.total_annual_giving !== null && funder.total_annual_giving > 0) {
    givingFacts.push(
      `Total annual giving (most recent filing): ${fmtMoney(funder.total_annual_giving)}`
    );
  }
  if (funder.avg_award_size !== null && funder.avg_award_size > 0) {
    givingFacts.push(`Average award size: ${fmtMoney(funder.avg_award_size)}`);
  }
  if (
    funder.typical_award_range_min !== null &&
    funder.typical_award_range_max !== null &&
    funder.typical_award_range_max > 0
  ) {
    givingFacts.push(
      `Typical award range: ${fmtMoney(funder.typical_award_range_min)} - ${fmtMoney(funder.typical_award_range_max)}`
    );
  }
  if (givingFacts.length > 0) {
    lines.push("");
    lines.push("Giving pattern:");
    for (const fact of givingFacts) lines.push(`  - ${fact}`);
  }

  // Recipient preferences
  const prefs: string[] = [];
  if (funder.org_size_preference) {
    prefs.push(`Prefers organizations of size: ${funder.org_size_preference}`);
  }
  if (funder.new_applicant_friendly === true) {
    prefs.push("Funds new applicants (not just repeat grantees)");
  } else if (funder.new_applicant_friendly === false) {
    prefs.push("Tends to fund repeat grantees rather than new applicants");
  }
  if (
    funder.acceptance_rate !== null &&
    funder.acceptance_rate > 0 &&
    funder.acceptance_rate <= 1
  ) {
    prefs.push(`Historical acceptance rate: ${fmtPct(funder.acceptance_rate)}`);
  }
  if (prefs.length > 0) {
    lines.push("");
    lines.push("Recipient preferences:");
    for (const pref of prefs) lines.push(`  - ${pref}`);
  }

  // Geographic preference (JSONB — render any string values; skip if empty)
  if (
    funder.geographic_preference &&
    typeof funder.geographic_preference === "object"
  ) {
    const geoEntries = Object.entries(funder.geographic_preference).filter(
      ([, v]) => v !== null && v !== undefined && v !== ""
    );
    if (geoEntries.length > 0) {
      lines.push("");
      lines.push("Geographic focus:");
      for (const [k, v] of geoEntries) {
        const renderedValue = Array.isArray(v) ? v.join(", ") : String(v);
        lines.push(`  - ${k}: ${renderedValue}`);
      }
    }
  }

  // If we made it here but the only thing we have is the header + funder name,
  // there's nothing useful to surface — return null to signal "skip the block."
  // Header (4 lines) + Funder name (1) + optional Type + optional Focus areas =
  // minimum useful is when at least one giving/prefs/geo subsection rendered.
  const hasUsefulContent =
    givingFacts.length > 0 ||
    prefs.length > 0 ||
    (funder.geographic_preference &&
      Object.keys(funder.geographic_preference).length > 0) ||
    (funder.focus_areas && funder.focus_areas.length > 0);

  if (!hasUsefulContent) return null;

  lines.push("");
  lines.push("=== END FUNDER CONTEXT ===");

  return lines.join("\n");
}
