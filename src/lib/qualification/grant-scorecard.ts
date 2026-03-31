// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScorecardCriterion {
  id: string;
  name: string;
  weight: number;
  aiScore: number | null; // 1-5, AI pre-filled
  userScore: number | null; // 1-5, user override
  finalScore: number; // userScore ?? aiScore (0 if both null)
  confidence: "high" | "medium" | "low";
  evidence: string; // What data supported this score
  source: "deterministic" | "ai_inferred" | "user_provided";
}

export interface ScorecardResult {
  grantId: string;
  orgId: string;
  criteria: ScorecardCriterion[];
  totalWeightedScore: number; // 0-85
  priority: "high" | "medium" | "low" | "do_not_pursue";
  recommendation: string;
  autoDisqualified: boolean;
  disqualifyReason: string | null;
}

// ─── Grant / Org shape (minimal — only what we need) ─────────────────────────

export interface ScorecardGrant {
  id: string;
  name: string;
  source_type: string | null;
  eligibility_types: string[] | null;
  states: string[] | null;
  amount_min: number | null;
  amount_max: number | null;
  deadline: string | null;
  funder_id: string | null;
}

export interface ScorecardOrg {
  id: string;
  entity_type: string;
  state: string | null;
  annual_budget: number | null;
  // From org_capabilities
  capabilities?: {
    prior_federal_grants?: number;
    prior_foundation_grants?: number;
    staff_count?: number;
  };
  // From match engine result
  missionAlignmentScore?: number | null; // 1-10 scale
  // Pipeline load: how many active grants are being worked
  activePipelineCount?: number;
}

// ─── Budget threshold helpers ────────────────────────────────────────────────

const BUDGET_MIN_GRANT: Array<{ budgetMin: number; grantMin: number }> = [
  { budgetMin: 500_000, grantMin: 5_000 },
  { budgetMin: 100_000, grantMin: 2_500 },
  { budgetMin: 0, grantMin: 1_000 },
];

function minGrantForBudget(budget: number): number {
  for (const tier of BUDGET_MIN_GRANT) {
    if (budget >= tier.budgetMin) return tier.grantMin;
  }
  return 1_000;
}

// ─── Auto-disqualify pre-screen ──────────────────────────────────────────────

export function runPreScreen(
  grant: ScorecardGrant,
  org: ScorecardOrg
): { pass: boolean; reason: string | null } {
  const now = new Date();

  // 1. Deadline passed or < 14 days out
  if (grant.deadline) {
    const deadline = new Date(grant.deadline);
    const daysUntil = Math.floor(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil < 0) {
      return { pass: false, reason: "Grant deadline has passed." };
    }
    if (daysUntil < 14) {
      return {
        pass: false,
        reason: `Only ${daysUntil} days until deadline — insufficient time to apply.`,
      };
    }
  }

  // 2. Entity type not eligible
  if (grant.eligibility_types && grant.eligibility_types.length > 0) {
    const orgType = org.entity_type;
    const eligible = grant.eligibility_types.some(
      (t) =>
        t.toLowerCase() === orgType.toLowerCase() ||
        (t.toLowerCase().includes("nonprofit") &&
          orgType.toLowerCase().includes("nonprofit"))
    );
    if (!eligible) {
      return {
        pass: false,
        reason: `Your entity type (${orgType}) is not listed as eligible. Required: ${grant.eligibility_types.join(", ")}.`,
      };
    }
  }

  // 3. Geographic mismatch
  if (grant.states && grant.states.length > 0 && org.state) {
    const eligible = grant.states.some(
      (s) =>
        s.toLowerCase() === org.state!.toLowerCase() ||
        s.toLowerCase() === "national" ||
        s.toLowerCase() === "all"
    );
    if (!eligible) {
      return {
        pass: false,
        reason: `Your state (${org.state}) is not in the grant's eligible states: ${grant.states.join(", ")}.`,
      };
    }
  }

  // 4. Award too small for org size
  if (org.annual_budget && grant.amount_max) {
    const minGrant = minGrantForBudget(org.annual_budget);
    if (grant.amount_max < minGrant) {
      return {
        pass: false,
        reason: `Grant amount ($${grant.amount_max.toLocaleString()}) is below your minimum threshold ($${minGrant.toLocaleString()}) given your org budget.`,
      };
    }
  }

  return { pass: true, reason: null };
}

// ─── Score interpretations ────────────────────────────────────────────────────

function scoreToPriority(
  score: number
): "high" | "medium" | "low" | "do_not_pursue" {
  if (score >= 68) return "high";
  if (score >= 51) return "medium";
  if (score >= 34) return "low";
  return "do_not_pursue";
}

function priorityToRecommendation(
  priority: "high" | "medium" | "low" | "do_not_pursue",
  grantName: string
): string {
  switch (priority) {
    case "high":
      return `Strong pursuit candidate. Add "${grantName}" to your active pipeline and begin application preparation immediately.`;
    case "medium":
      return `Moderate fit. Consider pursuing "${grantName}" if capacity allows — revisit your user scores to improve the outcome.`;
    case "low":
      return `Weak fit. "${grantName}" may not be worth the effort given competing priorities. Track for a future cycle.`;
    case "do_not_pursue":
      return `Do not pursue "${grantName}" at this time. The opportunity cost is too high relative to the likelihood of success.`;
  }
}

// ─── AI pre-fill logic ────────────────────────────────────────────────────────

export function buildScorecardCriteria(
  grant: ScorecardGrant,
  org: ScorecardOrg
): ScorecardCriterion[] {
  const now = new Date();

  // 1. Mission Alignment (weight 3) — from match engine
  const missionAlignment: ScorecardCriterion = (() => {
    const raw = org.missionAlignmentScore;
    if (raw !== null && raw !== undefined) {
      // Scale 1-10 → 1-5
      const score = Math.max(1, Math.min(5, Math.round(raw / 2)));
      return {
        id: "mission_alignment",
        name: "Mission Alignment",
        weight: 3,
        aiScore: score,
        userScore: null,
        finalScore: score,
        confidence: raw >= 7 ? "high" : raw >= 4 ? "medium" : "low",
        evidence: `Match engine gave a ${raw}/10 mission alignment score based on semantic similarity between your mission statement and grant focus areas.`,
        source: "ai_inferred",
      };
    }
    return {
      id: "mission_alignment",
      name: "Mission Alignment",
      weight: 3,
      aiScore: 3,
      userScore: null,
      finalScore: 3,
      confidence: "low",
      evidence:
        "No mission alignment score available from match engine. Defaulting to neutral (3/5).",
      source: "ai_inferred",
    };
  })();

  // 2. Eligibility Match (weight 3) — deterministic
  const eligibilityMatch: ScorecardCriterion = (() => {
    if (!grant.eligibility_types || grant.eligibility_types.length === 0) {
      return {
        id: "eligibility_match",
        name: "Eligibility Match",
        weight: 3,
        aiScore: 3,
        userScore: null,
        finalScore: 3,
        confidence: "medium",
        evidence: "No specific eligibility types listed — likely open to all.",
        source: "deterministic",
      };
    }
    const eligible = grant.eligibility_types.some(
      (t) =>
        t.toLowerCase() === org.entity_type.toLowerCase() ||
        (t.toLowerCase().includes("nonprofit") &&
          org.entity_type.toLowerCase().includes("nonprofit"))
    );
    return {
      id: "eligibility_match",
      name: "Eligibility Match",
      weight: 3,
      aiScore: eligible ? 5 : 1,
      userScore: null,
      finalScore: eligible ? 5 : 1,
      confidence: "high",
      evidence: eligible
        ? `Your entity type (${org.entity_type}) matches the grant's eligible types: ${grant.eligibility_types.join(", ")}.`
        : `Your entity type (${org.entity_type}) does NOT appear in: ${grant.eligibility_types.join(", ")}.`,
      source: "deterministic",
    };
  })();

  // 3. Geographic Fit (weight 2) — deterministic
  const geographicFit: ScorecardCriterion = (() => {
    if (!grant.states || grant.states.length === 0) {
      return {
        id: "geographic_fit",
        name: "Geographic Fit",
        weight: 2,
        aiScore: 5,
        userScore: null,
        finalScore: 5,
        confidence: "high",
        evidence: "Grant is available nationally — no geographic restriction.",
        source: "deterministic",
      };
    }
    if (!org.state) {
      return {
        id: "geographic_fit",
        name: "Geographic Fit",
        weight: 2,
        aiScore: 3,
        userScore: null,
        finalScore: 3,
        confidence: "low",
        evidence: `Grant restricts to ${grant.states.join(", ")} but your org state is not set. Please update your profile.`,
        source: "deterministic",
      };
    }
    const eligible = grant.states.some(
      (s) =>
        s.toLowerCase() === org.state!.toLowerCase() ||
        s.toLowerCase() === "national" ||
        s.toLowerCase() === "all"
    );
    return {
      id: "geographic_fit",
      name: "Geographic Fit",
      weight: 2,
      aiScore: eligible ? 5 : 1,
      userScore: null,
      finalScore: eligible ? 5 : 1,
      confidence: "high",
      evidence: eligible
        ? `Your state (${org.state}) is eligible. Grant covers: ${grant.states.join(", ")}.`
        : `Your state (${org.state}) is NOT in eligible states: ${grant.states.join(", ")}.`,
      source: "deterministic",
    };
  })();

  // 4. Award Amount (weight 2) — deterministic
  const awardAmount: ScorecardCriterion = (() => {
    const budget = org.annual_budget ?? 0;
    const amountMax = grant.amount_max ?? 0;
    const amountMin = grant.amount_min ?? 0;

    if (!amountMax) {
      return {
        id: "award_amount",
        name: "Award Amount Fit",
        weight: 2,
        aiScore: 3,
        userScore: null,
        finalScore: 3,
        confidence: "low",
        evidence: "Grant amount is not specified. Scoring neutral.",
        source: "deterministic",
      };
    }

    // Score based on award as % of annual budget
    let score: number;
    let evidence: string;
    const pct = budget > 0 ? (amountMax / budget) * 100 : 0;

    if (budget === 0) {
      score = 3;
      evidence = `Grant awards up to $${amountMax.toLocaleString()}. Unable to assess budget fit — org budget not set.`;
    } else if (pct >= 5 && pct <= 50) {
      score = 5;
      evidence = `Award ($${amountMax.toLocaleString()}) represents ${pct.toFixed(0)}% of your annual budget — ideal range.`;
    } else if (pct > 50 && pct <= 100) {
      score = 4;
      evidence = `Award ($${amountMax.toLocaleString()}) is ${pct.toFixed(0)}% of your budget — significant but achievable.`;
    } else if (pct > 100) {
      score = 3;
      evidence = `Award ($${amountMax.toLocaleString()}) exceeds your annual budget. Reporting burden may be high.`;
    } else {
      // < 5%
      score = 2;
      evidence = `Award ($${amountMax.toLocaleString()}) is only ${pct.toFixed(1)}% of your annual budget — may not be worth the effort.`;
    }

    if (amountMin > 0) {
      evidence += ` Award range: $${amountMin.toLocaleString()} – $${amountMax.toLocaleString()}.`;
    }

    return {
      id: "award_amount",
      name: "Award Amount Fit",
      weight: 2,
      aiScore: score,
      userScore: null,
      finalScore: score,
      confidence: budget > 0 ? "high" : "low",
      evidence,
      source: "deterministic",
    };
  })();

  // 5. Competition Level (weight 2) — AI inferred from source_type + funder data
  const competitionLevel: ScorecardCriterion = (() => {
    const sourceType = (grant.source_type ?? "foundation").toLowerCase();
    // Federal = very competitive (score 2), state = moderate (3), foundation = varies (3), corporate = less (4)
    const competitionMap: Record<string, { score: number; evidence: string }> =
      {
        federal: {
          score: 2,
          evidence:
            "Federal grants typically have acceptance rates of 5-20%. Expect high competition from national applicants.",
        },
        state: {
          score: 3,
          evidence:
            "State grants have moderate competition — limited to in-state applicants but still selective.",
        },
        foundation: {
          score: 3,
          evidence:
            "Foundation grants vary widely. Without specific acceptance rate data, scoring moderate competition.",
        },
        corporate: {
          score: 4,
          evidence:
            "Corporate grants often have fewer applicants and faster turnaround. Generally less competitive.",
        },
      };

    const map = competitionMap[sourceType] ?? competitionMap.foundation;
    return {
      id: "competition_level",
      name: "Competition Level",
      weight: 2,
      aiScore: map.score,
      userScore: null,
      finalScore: map.score,
      confidence: "medium",
      evidence: map.evidence,
      source: "ai_inferred",
    };
  })();

  // 6. Timeline Feasibility (weight 2) — days until deadline + pipeline load
  const timelineFeasibility: ScorecardCriterion = (() => {
    if (!grant.deadline) {
      return {
        id: "timeline_feasibility",
        name: "Timeline Feasibility",
        weight: 2,
        aiScore: 4,
        userScore: null,
        finalScore: 4,
        confidence: "medium",
        evidence: "Rolling deadline — you can apply at any time.",
        source: "ai_inferred",
      };
    }

    const deadline = new Date(grant.deadline);
    const daysUntil = Math.floor(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const pipelineLoad = org.activePipelineCount ?? 0;

    let score: number;
    let evidence: string;

    if (daysUntil >= 90) {
      score = 5;
      evidence = `${daysUntil} days until deadline — ample time to prepare.`;
    } else if (daysUntil >= 45) {
      score = 4;
      evidence = `${daysUntil} days until deadline — sufficient time with focused effort.`;
    } else if (daysUntil >= 30) {
      score = 3;
      evidence = `${daysUntil} days until deadline — tight but feasible.`;
    } else {
      score = 2;
      evidence = `Only ${daysUntil} days until deadline — very tight turnaround.`;
    }

    if (pipelineLoad >= 5) {
      score = Math.max(1, score - 1);
      evidence += ` Your pipeline has ${pipelineLoad} active grants — capacity may be strained.`;
    } else if (pipelineLoad >= 3) {
      evidence += ` You have ${pipelineLoad} active grants in progress — monitor capacity.`;
    }

    return {
      id: "timeline_feasibility",
      name: "Timeline Feasibility",
      weight: 2,
      aiScore: score,
      userScore: null,
      finalScore: score,
      confidence: "high",
      evidence,
      source: "ai_inferred",
    };
  })();

  // 7. Relationship Status (weight 1) — user must fill
  const relationshipStatus: ScorecardCriterion = {
    id: "relationship_status",
    name: "Relationship with Funder",
    weight: 1,
    aiScore: null,
    userScore: null,
    finalScore: 0,
    confidence: "low",
    evidence:
      "Rate your existing relationship with this funder: 1 = no relationship, 5 = strong warm connection.",
    source: "user_provided",
  };

  // 8. Reporting Burden (weight 1) — user must fill
  const reportingBurden: ScorecardCriterion = {
    id: "reporting_burden",
    name: "Reporting Burden",
    weight: 1,
    aiScore: null,
    userScore: null,
    finalScore: 0,
    confidence: "low",
    evidence:
      "Rate how manageable the reporting requirements are: 1 = very burdensome, 5 = minimal reporting.",
    source: "user_provided",
  };

  // 9. Strategic Value (weight 1) — user must fill
  const strategicValue: ScorecardCriterion = {
    id: "strategic_value",
    name: "Strategic Value",
    weight: 1,
    aiScore: null,
    userScore: null,
    finalScore: 0,
    confidence: "low",
    evidence:
      "Rate the strategic importance beyond dollars: 1 = no strategic value, 5 = opens major doors / builds credibility.",
    source: "user_provided",
  };

  return [
    missionAlignment,
    eligibilityMatch,
    geographicFit,
    awardAmount,
    competitionLevel,
    timelineFeasibility,
    relationshipStatus,
    reportingBurden,
    strategicValue,
  ];
}

// ─── Compute total weighted score ─────────────────────────────────────────────

export function computeWeightedScore(criteria: ScorecardCriterion[]): number {
  return criteria.reduce((sum, c) => sum + c.finalScore * c.weight, 0);
}

// ─── Main scorecard builder ───────────────────────────────────────────────────

export function buildScorecard(
  grant: ScorecardGrant,
  org: ScorecardOrg
): ScorecardResult {
  // Pre-screen
  const { pass, reason } = runPreScreen(grant, org);

  if (!pass) {
    return {
      grantId: grant.id,
      orgId: org.id,
      criteria: buildScorecardCriteria(grant, org),
      totalWeightedScore: 0,
      priority: "do_not_pursue",
      recommendation: reason ?? "This grant does not meet minimum requirements.",
      autoDisqualified: true,
      disqualifyReason: reason,
    };
  }

  const criteria = buildScorecardCriteria(grant, org);
  const totalWeightedScore = computeWeightedScore(criteria);
  const priority = scoreToPriority(totalWeightedScore);
  const recommendation = priorityToRecommendation(priority, grant.name);

  return {
    grantId: grant.id,
    orgId: org.id,
    criteria,
    totalWeightedScore,
    priority,
    recommendation,
    autoDisqualified: false,
    disqualifyReason: null,
  };
}

// ─── Apply user score overrides ───────────────────────────────────────────────

export function applyUserScores(
  result: ScorecardResult,
  userScores: Record<string, number>
): ScorecardResult {
  const updatedCriteria = result.criteria.map((c) => {
    const userScore = userScores[c.id];
    if (userScore !== undefined && userScore >= 1 && userScore <= 5) {
      return {
        ...c,
        userScore,
        finalScore: userScore,
        source: "user_provided" as const,
      };
    }
    return c;
  });

  const totalWeightedScore = computeWeightedScore(updatedCriteria);
  const priority = scoreToPriority(totalWeightedScore);
  const recommendation = priorityToRecommendation(priority, result.grantId);

  return {
    ...result,
    criteria: updatedCriteria,
    totalWeightedScore,
    priority,
    recommendation,
  };
}
