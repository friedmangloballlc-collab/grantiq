/**
 * A-Z Qualification Scoring
 *
 * Implements the 10-criteria (A–J) qualification framework from the Grant Services Playbook.
 * Each criterion returns a status of "qualified" | "partial" | "not_met" | "unknown"
 * and a 0–10 point score. The overall score is 0–100.
 */

export type CriterionStatus = "qualified" | "partial" | "not_met" | "unknown";

export interface AZCriterion {
  letter: string;
  name: string;
  question: string;
  status: CriterionStatus;
  score: number; // 0–10
  explanation: string;
  improvementAction: string;
  improvementHref: string;
}

export interface AZScoreResult {
  criteria: AZCriterion[];
  overallScore: number; // 0–100
}

// ─── Input shape from Supabase tables ───────────────────────────────────────

export interface OrgRow {
  annual_budget?: number | null;
  entity_type?: string | null;
  employee_count?: number | null;
}

export interface OrgProfileRow {
  business_stage?: string | null;
  grant_history_level?: string | null;
  program_areas?: string[] | null;
  documents_ready?: string | null;
  mission_statement?: string | null;
}

export interface OrgCapabilitiesRow {
  has_sam_registration?: boolean | null;
}

export interface SubscriptionRow {
  tier?: string | null; // "free" | "starter" | "pro" | "growth" | "enterprise"
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function qualified(name: string, question: string, explanation: string): AZCriterion {
  return { letter: "", name, question, status: "qualified", score: 10, explanation, improvementAction: "", improvementHref: "" };
}

function partial(name: string, question: string, explanation: string, action: string, href: string): AZCriterion {
  return { letter: "", name, question, status: "partial", score: 5, explanation, improvementAction: action, improvementHref: href };
}

function notMet(name: string, question: string, explanation: string, action: string, href: string): AZCriterion {
  return { letter: "", name, question, status: "not_met", score: 0, explanation, improvementAction: action, improvementHref: href };
}

function unknown(name: string, question: string): AZCriterion {
  return { letter: "", name, question, status: "unknown", score: 0, explanation: "Not yet assessed", improvementAction: "Complete your profile", improvementHref: "/onboarding" };
}

// ─── Scoring Logic ────────────────────────────────────────────────────────────

export function calculateAZScore(
  org: OrgRow | null,
  profile: OrgProfileRow | null,
  capabilities: OrgCapabilitiesRow | null,
  subscription: SubscriptionRow | null
): AZScoreResult {
  const criteria: AZCriterion[] = [];

  // A — Annual Budget
  const budget = org?.annual_budget;
  let criterionA: AZCriterion;
  if (budget == null) {
    criterionA = unknown("Annual Budget", "What is your org's annual budget?");
  } else if (budget >= 250_000) {
    criterionA = qualified("Annual Budget", "What is your org's annual budget?", `Your annual budget of $${budget.toLocaleString()} meets the $250K+ threshold.`);
  } else if (budget >= 100_000) {
    criterionA = partial("Annual Budget", "What is your org's annual budget?", `Your annual budget of $${budget.toLocaleString()} is above $100K but below the ideal $250K.`, "Update your budget in settings", "/settings");
  } else {
    criterionA = notMet("Annual Budget", "What is your org's annual budget?", `An annual budget of $${budget.toLocaleString()} is below the $100K minimum for most institutional grants.`, "Update your organization profile", "/settings");
  }
  criterionA.letter = "A";
  criteria.push(criterionA);

  // B — Budget for Grants (proxy: subscription tier)
  const tier = subscription?.tier ?? "free";
  let criterionB: AZCriterion;
  if (tier === "pro" || tier === "enterprise") {
    criterionB = qualified("Budget for Grants", "Can you invest in grant services?", "Your Pro/Enterprise subscription shows a commitment to grant investment.");
  } else if (tier === "starter") {
    criterionB = partial("Budget for Grants", "Can you invest in grant services?", "Your Starter plan indicates some budget, but upgrading unlocks full grant writing support.", "Upgrade to Pro", "/settings/billing");
  } else {
    criterionB = notMet("Budget for Grants", "Can you invest in grant services?", "A free plan suggests limited budget for grant services — most funders expect a financial commitment.", "Upgrade your plan", "/settings/billing");
  }
  criterionB.letter = "B";
  criteria.push(criterionB);

  // C — Capacity to Implement
  const employeeCount = org?.employee_count;
  const stage = profile?.business_stage;
  let criterionC: AZCriterion;
  if (employeeCount == null && stage == null) {
    criterionC = unknown("Capacity to Implement", "Can you execute grant-funded programs?");
  } else if ((employeeCount != null && employeeCount >= 3) || stage === "scaling" || stage === "established") {
    criterionC = qualified("Capacity to Implement", "Can you execute grant-funded programs?", "Your team size and stage indicate strong capacity to run grant-funded programs.");
  } else if ((employeeCount != null && employeeCount >= 1) || stage === "growing") {
    criterionC = partial("Capacity to Implement", "Can you execute grant-funded programs?", "You have some capacity but may need additional staff or systems to fully execute larger grants.", "Add staff details in settings", "/settings");
  } else {
    criterionC = notMet("Capacity to Implement", "Can you execute grant-funded programs?", "Limited team capacity may prevent you from executing grant-funded programs.", "Update your team info", "/settings");
  }
  criterionC.letter = "C";
  criteria.push(criterionC);

  // D — Data and Outcomes
  const missionLength = profile?.mission_statement?.trim().length ?? 0;
  const programAreas = profile?.program_areas ?? [];
  let criterionD: AZCriterion;
  if (missionLength === 0 && programAreas.length === 0) {
    criterionD = unknown("Data and Outcomes", "Do you track program outcomes?");
  } else if (missionLength > 100 && programAreas.length > 0) {
    criterionD = qualified("Data and Outcomes", "Do you track program outcomes?", "Your program descriptions and mission statement suggest strong outcome tracking.");
  } else if (missionLength > 30 || programAreas.length > 0) {
    criterionD = partial("Data and Outcomes", "Do you track program outcomes?", "You have some program data but could strengthen outcome documentation.", "Improve your program descriptions", "/onboarding");
  } else {
    criterionD = notMet("Data and Outcomes", "Do you track program outcomes?", "Without documented outcomes, it's difficult to demonstrate impact to funders.", "Add program descriptions", "/onboarding");
  }
  criterionD.letter = "D";
  criteria.push(criterionD);

  // E — Entity Status
  const entityType = org?.entity_type;
  let criterionE: AZCriterion;
  if (!entityType) {
    criterionE = unknown("Entity Status", "What is your legal status?");
  } else if (
    entityType.toLowerCase().includes("501") ||
    entityType.toLowerCase().includes("nonprofit") ||
    entityType.toLowerCase().includes("non-profit") ||
    entityType.toLowerCase().includes("government") ||
    entityType.toLowerCase().includes("tribal") ||
    entityType.toLowerCase().includes("educational") ||
    entityType.toLowerCase().includes("university")
  ) {
    criterionE = qualified("Entity Status", "What is your legal status?", `Your ${entityType} status qualifies you for the vast majority of grant programs.`);
  } else if (
    entityType.toLowerCase().includes("llc") ||
    entityType.toLowerCase().includes("corporation") ||
    entityType.toLowerCase().includes("pending")
  ) {
    criterionE = partial("Entity Status", "What is your legal status?", `${entityType} entities can access some grants, but 501(c)(3) or equivalent status unlocks far more opportunities.`, "Learn about 501(c)(3) status", "/resources");
  } else {
    criterionE = notMet("Entity Status", "What is your legal status?", "Without a recognized legal entity, most institutional grant programs are inaccessible.", "Update your entity type", "/settings");
  }
  criterionE.letter = "E";
  criteria.push(criterionE);

  // F — Federal Readiness (SAM.gov)
  const hasSam = capabilities?.has_sam_registration;
  let criterionF: AZCriterion;
  if (hasSam == null) {
    criterionF = unknown("Federal Readiness", "Are you registered in SAM.gov?");
  } else if (hasSam === true) {
    criterionF = qualified("Federal Readiness", "Are you registered in SAM.gov?", "SAM.gov registration unlocks federal grants and significantly expands your funding universe.");
  } else {
    criterionF = notMet("Federal Readiness", "Are you registered in SAM.gov?", "Without SAM.gov registration you cannot apply for federal grants, which represent the largest funding pool.", "Register at SAM.gov", "https://sam.gov");
  }
  criterionF.letter = "F";
  criteria.push(criterionF);

  // G — Grant History
  const grantHistory = profile?.grant_history_level;
  let criterionG: AZCriterion;
  if (!grantHistory) {
    criterionG = unknown("Grant History", "Have you received grants before?");
  } else if (grantHistory === "experienced" || grantHistory === "active") {
    criterionG = qualified("Grant History", "Have you received grants before?", "Your grant history demonstrates credibility with funders.");
  } else if (grantHistory === "some" || grantHistory === "beginner") {
    criterionG = partial("Grant History", "Have you received grants before?", "Some grant experience helps, but building a stronger track record will open more doors.", "Add grants to your pipeline", "/pipeline");
  } else {
    criterionG = notMet("Grant History", "Have you received grants before?", "No grant history makes it harder to win competitive grants — start with smaller, accessible funders.", "Find starter grants", "/matches");
  }
  criterionG.letter = "G";
  criteria.push(criterionG);

  // H — Has Clear Programs
  const programs = profile?.program_areas ?? [];
  let criterionH: AZCriterion;
  if (programs.length === 0 && missionLength === 0) {
    criterionH = unknown("Has Clear Programs", "Do you have defined programs?");
  } else if (programs.length >= 2) {
    criterionH = qualified("Has Clear Programs", "Do you have defined programs?", `You have ${programs.length} defined program areas — funders can clearly understand what you do.`);
  } else if (programs.length === 1 || missionLength > 50) {
    criterionH = partial("Has Clear Programs", "Do you have defined programs?", "You have some program definition, but adding more detail will increase your match quality.", "Expand your program descriptions", "/onboarding");
  } else {
    criterionH = notMet("Has Clear Programs", "Do you have defined programs?", "Funders need to understand your programs clearly before they'll invest in your work.", "Define your programs", "/onboarding");
  }
  criterionH.letter = "H";
  criteria.push(criterionH);

  // I — Internal Champion (proxy: employee count > 1)
  let criterionI: AZCriterion;
  if (employeeCount == null) {
    criterionI = unknown("Internal Champion", "Who will own the grant process?");
  } else if (employeeCount >= 2) {
    criterionI = qualified("Internal Champion", "Who will own the grant process?", "With multiple staff members, you can designate someone to own the grant process.");
  } else if (employeeCount === 1) {
    criterionI = partial("Internal Champion", "Who will own the grant process?", "As a solo operator, you can still champion grants, but capacity is a concern for funders.", "Update your team info", "/settings");
  } else {
    criterionI = notMet("Internal Champion", "Who will own the grant process?", "No identified staff means no one owns accountability for grant execution — a red flag for funders.", "Add your team", "/settings");
  }
  criterionI.letter = "I";
  criteria.push(criterionI);

  // J — Just Starting or Scaling
  let criterionJ: AZCriterion;
  if (!stage) {
    criterionJ = unknown("Just Starting or Scaling", "Where are you in your grant journey?");
  } else if (stage === "scaling" || stage === "established" || stage === "growing" || stage === "new") {
    criterionJ = qualified("Just Starting or Scaling", "Where are you in your grant journey?", `Your ${stage} stage shows momentum — funders look for organizations with a clear growth trajectory.`);
  } else if (stage === "starting") {
    criterionJ = partial("Just Starting or Scaling", "Where are you in your grant journey?", "Early-stage organizations can get grants, but you'll need strong narrative and program clarity.", "Strengthen your onboarding profile", "/onboarding");
  } else {
    // e.g. "burned_out", "stalled"
    criterionJ = notMet("Just Starting or Scaling", "Where are you in your grant journey?", "Organizations that are stalled or burned out struggle to show funders the forward momentum they require.", "Update your stage profile", "/onboarding");
  }
  criterionJ.letter = "J";
  criteria.push(criterionJ);

  // ─── Overall Score ──────────────────────────────────────────────────────────
  const totalPoints = criteria.reduce((sum, c) => sum + c.score, 0);
  const overallScore = Math.round((totalPoints / (criteria.length * 10)) * 100);

  return { criteria, overallScore };
}
