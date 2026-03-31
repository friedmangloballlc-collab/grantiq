// grantiq/src/lib/grants/application-checklist.ts

export interface ChecklistItem {
  id: string;
  category: "document" | "content" | "budget" | "admin";
  item: string;
  required: boolean;
  status: "complete" | "in_progress" | "not_started";
  linkedFeature?: string; // "vault" | "writing" | "budget_builder"
}

export interface OrgCapabilities {
  has_sam_registration: boolean;
  has_501c3: boolean;
  has_audit: boolean;
  has_board_list: boolean;
  has_w9: boolean;
  has_articles_of_incorporation: boolean;
  has_bylaws: boolean;
  has_irs_determination: boolean;
  has_financial_statements: boolean;
  has_strategic_plan: boolean;
}

export interface GrantSource {
  id: string;
  name: string;
  source_type: "federal" | "state" | "foundation" | "corporate";
  amount_max: number | null;
  amount_min: number | null;
  deadline: string | null;
  eligibility_types: string[];
  category: string | null;
  funder_name: string;
}

const DEFAULT_CAPABILITIES: OrgCapabilities = {
  has_sam_registration: false,
  has_501c3: false,
  has_audit: false,
  has_board_list: false,
  has_w9: false,
  has_articles_of_incorporation: false,
  has_bylaws: false,
  has_irs_determination: false,
  has_financial_statements: false,
  has_strategic_plan: false,
};

export function generateChecklist(
  grant: GrantSource,
  orgDocuments: string[],
  orgCapabilities: Partial<OrgCapabilities> = {}
): ChecklistItem[] {
  const caps: OrgCapabilities = { ...DEFAULT_CAPABILITIES, ...orgCapabilities };
  const items: ChecklistItem[] = [];

  // ─── Document items by source type ─────────────────────────────────────────

  if (grant.source_type === "federal") {
    items.push({
      id: "sam",
      category: "document",
      item: "Active SAM.gov registration",
      required: true,
      status: caps.has_sam_registration ? "complete" : "not_started",
      linkedFeature: "vault",
    });
    items.push({
      id: "501c3",
      category: "document",
      item: "501(c)(3) determination letter",
      required: true,
      status: caps.has_501c3 ? "complete" : "not_started",
      linkedFeature: "vault",
    });
    items.push({
      id: "audit",
      category: "document",
      item: "Most recent audited financials (Single Audit if >$750K federal)",
      required: true,
      status: caps.has_audit ? "complete" : "not_started",
      linkedFeature: "vault",
    });
    items.push({
      id: "indirect_rate",
      category: "admin",
      item: "Negotiated Indirect Cost Rate Agreement (NICRA) or de minimis election",
      required: true,
      status: "not_started",
      linkedFeature: "vault",
    });
    items.push({
      id: "congressional_district",
      category: "admin",
      item: "Congressional district number for project site",
      required: true,
      status: "not_started",
    });
    items.push({
      id: "duns_uei",
      category: "admin",
      item: "Unique Entity Identifier (UEI) from SAM.gov",
      required: true,
      status: caps.has_sam_registration ? "complete" : "not_started",
    });
  }

  if (grant.source_type === "foundation") {
    items.push({
      id: "501c3",
      category: "document",
      item: "501(c)(3) determination letter",
      required: true,
      status: caps.has_501c3 ? "complete" : "not_started",
      linkedFeature: "vault",
    });
    items.push({
      id: "financial_statements",
      category: "document",
      item: "Most recent financial statements (audited or reviewed)",
      required: true,
      status: caps.has_financial_statements ? "complete" : "not_started",
      linkedFeature: "vault",
    });
    items.push({
      id: "board_list",
      category: "document",
      item: "Current board of directors list",
      required: true,
      status: caps.has_board_list ? "complete" : "not_started",
      linkedFeature: "vault",
    });
  }

  if (grant.source_type === "corporate") {
    items.push({
      id: "w9",
      category: "document",
      item: "W-9 form",
      required: true,
      status: caps.has_w9 ? "complete" : "not_started",
      linkedFeature: "vault",
    });
    items.push({
      id: "501c3",
      category: "document",
      item: "501(c)(3) determination letter",
      required: true,
      status: caps.has_501c3 ? "complete" : "not_started",
      linkedFeature: "vault",
    });
    items.push({
      id: "impact_data",
      category: "document",
      item: "Impact report or program data summary",
      required: false,
      status: "not_started",
      linkedFeature: "vault",
    });
  }

  if (grant.source_type === "state") {
    items.push({
      id: "state_registration",
      category: "admin",
      item: "Active state nonprofit registration",
      required: true,
      status: "not_started",
      linkedFeature: "vault",
    });
    items.push({
      id: "articles",
      category: "document",
      item: "Articles of incorporation",
      required: true,
      status: caps.has_articles_of_incorporation ? "complete" : "not_started",
      linkedFeature: "vault",
    });
    items.push({
      id: "bylaws",
      category: "document",
      item: "Organizational bylaws",
      required: true,
      status: caps.has_bylaws ? "complete" : "not_started",
      linkedFeature: "vault",
    });
    items.push({
      id: "financial_statements",
      category: "document",
      item: "Most recent financial statements",
      required: true,
      status: caps.has_financial_statements ? "complete" : "not_started",
      linkedFeature: "vault",
    });
  }

  // ─── Universal documents ────────────────────────────────────────────────────

  items.push({
    id: "board_list",
    category: "document",
    item: "Board of directors list with affiliations",
    required: grant.source_type !== "foundation", // foundation already added above
    status: caps.has_board_list ? "complete" : "not_started",
    linkedFeature: "vault",
  });

  // ─── Content sections (always needed) ──────────────────────────────────────

  items.push({
    id: "narrative",
    category: "content",
    item: "Project narrative / description",
    required: true,
    status: "not_started",
    linkedFeature: "writing",
  });
  items.push({
    id: "needs",
    category: "content",
    item: "Statement of need / problem statement",
    required: true,
    status: "not_started",
    linkedFeature: "writing",
  });
  items.push({
    id: "goals",
    category: "content",
    item: "Goals and measurable objectives",
    required: true,
    status: "not_started",
    linkedFeature: "writing",
  });
  items.push({
    id: "evaluation",
    category: "content",
    item: "Evaluation plan",
    required: true,
    status: "not_started",
    linkedFeature: "writing",
  });
  items.push({
    id: "sustainability",
    category: "content",
    item: "Sustainability plan",
    required: grant.source_type === "federal",
    status: "not_started",
    linkedFeature: "writing",
  });
  items.push({
    id: "org_capacity",
    category: "content",
    item: "Organizational capacity / qualifications",
    required: true,
    status: "not_started",
    linkedFeature: "writing",
  });

  // ─── Budget items (always needed) ──────────────────────────────────────────

  items.push({
    id: "budget",
    category: "budget",
    item: "Project budget (line-item detail)",
    required: true,
    status: "not_started",
    linkedFeature: "budget_builder",
  });
  items.push({
    id: "budget_narrative",
    category: "budget",
    item: "Budget narrative / justification",
    required: true,
    status: "not_started",
    linkedFeature: "writing",
  });
  if (grant.source_type === "federal") {
    items.push({
      id: "cost_share",
      category: "budget",
      item: "Cost share / matching funds documentation (if required)",
      required: false,
      status: "not_started",
      linkedFeature: "vault",
    });
  }

  // ─── Admin items ────────────────────────────────────────────────────────────

  items.push({
    id: "cover_letter",
    category: "admin",
    item: "Cover letter / transmittal letter",
    required: grant.source_type !== "federal",
    status: "not_started",
    linkedFeature: "writing",
  });
  items.push({
    id: "abstract",
    category: "admin",
    item: "Project abstract / executive summary (250–500 words)",
    required: true,
    status: "not_started",
    linkedFeature: "writing",
  });
  items.push({
    id: "signature",
    category: "admin",
    item: "Authorized organizational signatory identified",
    required: true,
    status: "not_started",
  });

  // Deduplicate by id (foundation already pushed board_list above)
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function checklistProgress(items: ChecklistItem[]): {
  total: number;
  complete: number;
  percent: number;
} {
  const total = items.length;
  const complete = items.filter((i) => i.status === "complete").length;
  const percent = total === 0 ? 0 : Math.round((complete / total) * 100);
  return { total, complete, percent };
}

export const CATEGORY_LABELS: Record<ChecklistItem["category"], string> = {
  document: "Required Documents",
  content: "Content Sections",
  budget: "Budget",
  admin: "Administrative",
};

export const FEATURE_ACTION_LABELS: Record<string, { label: string; href: (grantId: string) => string }> = {
  vault: { label: "Upload", href: () => "/vault" },
  writing: { label: "Write with AI", href: (id) => `/grants/${id}/write` },
  budget_builder: { label: "Build Budget", href: (id) => `/grants/${id}/budget` },
};
