/**
 * Pre-computes deterministic eligibility signals from org data.
 * These are facts we can derive without AI — injected into prompts
 * so the AI doesn't hallucinate them.
 */

export interface PrecomputedSignals {
  entity_type_category: "for_profit" | "nonprofit" | "other";
  has_formal_entity: boolean;
  is_501c3: boolean;
  has_ein: boolean;
  sam_registered: boolean;
  sam_status: string;
  has_audit: boolean;
  audit_status: string;
  years_operating: number | null;
  under_one_year: boolean;
  under_three_years: boolean;
  has_dedicated_bank_account: boolean;
  federal_certifications: string[];
  has_naics: boolean;
  naics_primary: string | null;
  employee_count: number | null;
  is_sole_operator: boolean;
  annual_budget: number | null;
  state: string | null;
  industry: string | null;
  eligible_grant_types: string[];
  blocked_grant_types: string[];
  blockers: string[];
}

const FOR_PROFIT_TYPES = new Set([
  "llc", "corporation", "s_corp", "c_corp", "sole_prop",
  "sole_proprietorship", "partnership", "other",
]);

export function precomputeEligibilitySignals(orgData: Record<string, unknown>): PrecomputedSignals {
  const entityType = (orgData.entity_type as string) ?? "other";
  const isNonprofit = entityType.startsWith("nonprofit");
  const isForProfit = FOR_PROFIT_TYPES.has(entityType);
  const is501c3 = entityType === "nonprofit_501c3" || orgData.has_501c3 === true;
  const hasEin = orgData.has_ein === true || !!orgData.ein;
  const samStatus = (orgData.sam_registration_status as string) ?? "unknown";
  const samRegistered = samStatus === "registered" || orgData.has_sam_registration === true;
  const hasAudit = orgData.has_audit === true;
  const auditStatus = (orgData.audit_status as string) ?? "unknown";
  const yearsOp = orgData.years_operating as number | null;
  const underOneYear = yearsOp != null && yearsOp < 1;
  const underThreeYears = yearsOp != null && yearsOp < 3;
  const employeeCount = orgData.employee_count as number | null;
  const isSoleOp = employeeCount != null && employeeCount <= 1;
  const annualBudget = orgData.annual_budget as number | null;
  const naicsPrimary = (orgData.naics_primary as string) ?? null;
  const fedCerts = (orgData.federal_certifications as string[]) ?? [];
  const state = (orgData.state as string) ?? null;
  const industry = (orgData.industry as string) ?? null;
  const hasFormalEntity = entityType !== "sole_prop" && entityType !== "sole_proprietorship" && entityType !== "other";

  // Determine eligible and blocked grant types
  const eligible: string[] = [];
  const blocked: string[] = [];
  const blockers: string[] = [];

  // Federal grants
  if (samRegistered && hasFormalEntity) {
    eligible.push("Federal Grants (grants.gov)");
  } else {
    if (!samRegistered) blockers.push("Not registered on SAM.gov — blocks all federal grants");
    if (!hasFormalEntity) blockers.push("No formal entity — blocks most federal grants");
    blocked.push("Federal Grants (grants.gov)");
  }

  // SBA Programs
  if (isForProfit && hasFormalEntity) {
    eligible.push("SBA Programs");
  } else if (isNonprofit) {
    blocked.push("SBA Programs (for-profit only)");
  }

  // SBIR/STTR
  if (isForProfit && hasFormalEntity) {
    eligible.push("SBIR / STTR");
  } else {
    blocked.push("SBIR / STTR (for-profit US small business only)");
  }

  // State Economic Development
  if (hasFormalEntity && state) {
    eligible.push("State Economic Development");
  }

  // Private Foundation
  if (is501c3) {
    eligible.push("Private Foundation");
  } else if (isNonprofit) {
    eligible.push("Private Foundation (with fiscal sponsorship)");
  } else {
    blocked.push("Private Foundation (501(c)(3) required for most)");
  }

  // Corporate Starter Grants
  eligible.push("Corporate Starter Grants");

  // Nonprofit-Only
  if (isNonprofit) {
    eligible.push("Nonprofit-Only Grants");
  } else {
    blocked.push("Nonprofit-Only Grants");
  }

  // Age blockers
  if (underOneYear) {
    blockers.push("Organization under 1 year old — blocks most grants requiring operating history");
  }
  if (underThreeYears) {
    blockers.push("Under 3 years operating — many federal and foundation grants require 2-3 years of financial statements");
  }

  // Sole prop blocker
  if (!hasFormalEntity) {
    blockers.push("No formal business entity — sole proprietorships are ineligible for most grant programs");
  }

  return {
    entity_type_category: isNonprofit ? "nonprofit" : isForProfit ? "for_profit" : "other",
    has_formal_entity: hasFormalEntity,
    is_501c3: is501c3,
    has_ein: hasEin,
    sam_registered: samRegistered,
    sam_status: samStatus,
    has_audit: hasAudit,
    audit_status: auditStatus,
    years_operating: yearsOp,
    under_one_year: underOneYear,
    under_three_years: underThreeYears,
    has_dedicated_bank_account: orgData.has_dedicated_bank_account === true,
    federal_certifications: fedCerts,
    has_naics: !!naicsPrimary,
    naics_primary: naicsPrimary,
    employee_count: employeeCount,
    is_sole_operator: isSoleOp,
    annual_budget: annualBudget,
    state,
    industry,
    eligible_grant_types: eligible,
    blocked_grant_types: blocked,
    blockers,
  };
}

/** Format pre-computed signals as text to inject into AI prompts */
export function formatSignalsForPrompt(signals: PrecomputedSignals): string {
  const lines = [
    "PRE-COMPUTED ELIGIBILITY SIGNALS (verified from database — do not override):",
    `Entity Type: ${signals.entity_type_category}`,
    `Formal Entity: ${signals.has_formal_entity ? "Yes" : "No"}`,
    `501(c)(3): ${signals.is_501c3 ? "Yes" : "No"}`,
    `EIN: ${signals.has_ein ? "Yes" : "No/Unknown"}`,
    `SAM.gov: ${signals.sam_registered ? "Registered" : signals.sam_status}`,
    `Audited Financials: ${signals.has_audit ? "Yes" : "No"} (${signals.audit_status})`,
    `Years Operating: ${signals.years_operating ?? "Unknown"}`,
    `Employees: ${signals.employee_count ?? "Unknown"}`,
    `Annual Budget: ${signals.annual_budget ? "$" + signals.annual_budget.toLocaleString() : "Unknown"}`,
    `State: ${signals.state ?? "Unknown"}`,
    `Industry: ${signals.industry ?? "Unknown"}`,
    `NAICS: ${signals.naics_primary ?? "Not set"}`,
    `Federal Certifications: ${signals.federal_certifications.length > 0 ? signals.federal_certifications.join(", ") : "None"}`,
    "",
    `ELIGIBLE GRANT TYPES: ${signals.eligible_grant_types.join("; ")}`,
    `BLOCKED GRANT TYPES: ${signals.blocked_grant_types.join("; ")}`,
  ];

  if (signals.blockers.length > 0) {
    lines.push("", "KNOWN BLOCKERS:");
    signals.blockers.forEach((b) => lines.push(`  - ${b}`));
  }

  return lines.join("\n");
}
