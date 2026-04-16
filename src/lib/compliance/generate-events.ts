/**
 * Auto-generates compliance calendar events based on org profile data.
 * Called after onboarding, profile updates, or manually.
 */

interface OrgContext {
  orgId: string;
  entityType: string;
  state: string | null;
  is501c3: boolean;
  hasSam: boolean;
  samRegistrationDate: string | null;
  hasUei: boolean;
  hasAudit: boolean;
  hasInsurance: boolean;
  employeeCount: number | null;
  annualBudget: number | null;
  yearFormed: number | null;
}

interface ComplianceEvent {
  org_id: string;
  event_type: string;
  title: string;
  description: string;
  due_date: string;
  reminder_days: number[];
  recurrence: string;
  risk_if_missed: string;
  action_url: string;
  auto_generated: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();

export function generateComplianceEvents(ctx: OrgContext): ComplianceEvent[] {
  const events: ComplianceEvent[] = [];
  const orgId = ctx.orgId;

  // ── SAM.gov Annual Renewal ──
  if (ctx.hasSam) {
    const renewalDate = ctx.samRegistrationDate
      ? addYears(ctx.samRegistrationDate, 1)
      : `${CURRENT_YEAR}-12-31`;
    events.push({
      org_id: orgId,
      event_type: "sam_renewal",
      title: "SAM.gov Registration Renewal",
      description: "Your SAM.gov registration must be renewed annually. Failure to renew blocks ALL federal grant applications and contract eligibility. Start renewal 30 days before expiration.",
      due_date: renewalDate,
      reminder_days: [60, 30, 14, 7],
      recurrence: "annual",
      risk_if_missed: "Blocks 100% of federal grants and contracts. Cannot submit any federal application until renewed. Renewal can take 2-4 weeks for IRS validation.",
      action_url: "https://sam.gov",
      auto_generated: true,
    });
  } else {
    // Recommend getting SAM registration
    events.push({
      org_id: orgId,
      event_type: "sam_renewal",
      title: "Register on SAM.gov",
      description: "You are not registered on SAM.gov. Registration is required for all federal grants and takes 2-4 weeks. Start now — it's free.",
      due_date: nextMonthFirst(),
      reminder_days: [14, 7],
      recurrence: "one_time",
      risk_if_missed: "Cannot apply for any federal grants without active SAM.gov registration.",
      action_url: "https://sam.gov",
      auto_generated: true,
    });
  }

  // ── UEI Renewal (tied to SAM) ──
  if (ctx.hasUei) {
    events.push({
      org_id: orgId,
      event_type: "uei_renewal",
      title: "Verify UEI is Current",
      description: "Your Unique Entity Identifier (UEI) should be verified annually alongside your SAM.gov renewal. UEI is automatically maintained through SAM.gov.",
      due_date: `${CURRENT_YEAR}-12-31`,
      reminder_days: [30],
      recurrence: "annual",
      risk_if_missed: "UEI issues can delay federal grant applications.",
      action_url: "https://sam.gov",
      auto_generated: true,
    });
  }

  // ── IRS Form 990 Filing (Nonprofits) ──
  if (ctx.is501c3 || ctx.entityType.startsWith("nonprofit")) {
    events.push({
      org_id: orgId,
      event_type: "990_filing",
      title: "IRS Form 990 Filing Deadline",
      description: "Form 990 (or 990-EZ/990-N) is due on the 15th day of the 5th month after your fiscal year ends. For calendar-year organizations, this is May 15. Three consecutive years of non-filing results in automatic revocation of tax-exempt status.",
      due_date: `${CURRENT_YEAR + 1}-05-15`,
      reminder_days: [90, 60, 30, 14],
      recurrence: "annual",
      risk_if_missed: "3 consecutive missed filings = automatic loss of 501(c)(3) status. Many funders require current 990 to be filed before they'll review your application.",
      action_url: "https://www.irs.gov/charities-non-profits/annual-filing-and-forms",
      auto_generated: true,
    });
  }

  // ── State Annual Report ──
  if (ctx.state) {
    events.push({
      org_id: orgId,
      event_type: "state_annual_report",
      title: `${ctx.state} State Annual Report`,
      description: `Most states require an annual report to maintain good standing. Check your state's Secretary of State website for the exact deadline and filing requirements for ${ctx.state}.`,
      due_date: `${CURRENT_YEAR + 1}-04-01`,
      reminder_days: [60, 30, 14],
      recurrence: "annual",
      risk_if_missed: "Loss of good standing blocks grant applications. Many grants require a Certificate of Good Standing within 90 days.",
      action_url: `https://www.google.com/search?q=${ctx.state}+secretary+of+state+annual+report`,
      auto_generated: true,
    });
  }

  // ── Certificate of Good Standing ──
  events.push({
    org_id: orgId,
    event_type: "good_standing",
    title: "Request Certificate of Good Standing",
    description: "Many grant applications require a Certificate of Good Standing issued within the last 90 days. Request a fresh one before each major application cycle.",
    due_date: nextQuarterFirst(),
    reminder_days: [14],
    recurrence: "quarterly",
    risk_if_missed: "Grant applications requiring this document cannot be submitted without it. Processing takes 1-2 weeks in most states.",
    action_url: ctx.state ? `https://www.google.com/search?q=${ctx.state}+certificate+of+good+standing` : "",
    auto_generated: true,
  });

  // ── Charitable Solicitation Registration (Nonprofits) ──
  if (ctx.is501c3 || ctx.entityType.startsWith("nonprofit")) {
    events.push({
      org_id: orgId,
      event_type: "charitable_registration",
      title: "State Charitable Solicitation Registration Renewal",
      description: "Most states require charitable organizations to register before soliciting donations. Registration must be renewed annually. Check your state's Attorney General or Secretary of State website.",
      due_date: `${CURRENT_YEAR + 1}-01-15`,
      reminder_days: [60, 30, 14],
      recurrence: "annual",
      risk_if_missed: "Fundraising without registration can result in fines and loss of eligibility for foundation grants that require proof of registration.",
      action_url: "https://www.nasconet.org/resources/state-registrationrenewal-deadlines",
      auto_generated: true,
    });
  }

  // ── Insurance Renewal ──
  if (ctx.hasInsurance) {
    events.push({
      org_id: orgId,
      event_type: "insurance_renewal",
      title: "Insurance Policy Renewal",
      description: "Review and renew General Liability, Workers' Comp, D&O, and any other required insurance policies. Most grants require current Certificate of Insurance (COI) as part of the application.",
      due_date: `${CURRENT_YEAR + 1}-01-01`,
      reminder_days: [60, 30, 14],
      recurrence: "annual",
      risk_if_missed: "Lapsed insurance blocks grant applications requiring COI. May also expose the organization to liability.",
      action_url: "",
      auto_generated: true,
    });
  }

  // ── Board Meeting / Conflict of Interest (Nonprofits) ──
  if (ctx.is501c3 || ctx.entityType.startsWith("nonprofit")) {
    events.push({
      org_id: orgId,
      event_type: "board_meeting",
      title: "Quarterly Board Meeting",
      description: "Schedule and hold quarterly board meetings with minutes documented. Many funders require 24 months of board minutes as part of due diligence.",
      due_date: nextQuarterFirst(),
      reminder_days: [14, 7],
      recurrence: "quarterly",
      risk_if_missed: "Missing board minutes is a common finding in funder site visits. Shows weak governance.",
      action_url: "",
      auto_generated: true,
    });

    events.push({
      org_id: orgId,
      event_type: "coi_renewal",
      title: "Annual Conflict of Interest Disclosure",
      description: "All board members and key staff must sign an annual Conflict of Interest disclosure. Required by IRS for 501(c)(3) organizations and checked by most funders.",
      due_date: `${CURRENT_YEAR + 1}-01-31`,
      reminder_days: [30, 14],
      recurrence: "annual",
      risk_if_missed: "Missing COI disclosures is a red flag for funders. Required question on Form 990.",
      action_url: "",
      auto_generated: true,
    });
  }

  // ── Federal Audit (if receiving $750K+ in federal funds) ──
  if (ctx.annualBudget && ctx.annualBudget >= 750000) {
    events.push({
      org_id: orgId,
      event_type: "audit_due",
      title: "Single Audit (2 CFR 200) Deadline",
      description: "Organizations expending $750,000+ in federal awards must complete a Single Audit within 9 months of fiscal year end. Coordinate with your CPA early.",
      due_date: `${CURRENT_YEAR + 1}-09-30`,
      reminder_days: [120, 90, 60, 30],
      recurrence: "annual",
      risk_if_missed: "Non-compliance with Single Audit requirement can result in funding suspension, repayment demands, and debarment from future federal awards.",
      action_url: "https://www.ecfr.gov/current/title-2/subtitle-A/chapter-II/part-200/subpart-F",
      auto_generated: true,
    });
  }

  // ── EIN Verification ──
  events.push({
    org_id: orgId,
    event_type: "ein_verification",
    title: "Annual EIN & Tax Compliance Verification",
    description: "Verify your EIN is active, federal and state tax returns are current, and no liens or levies exist. Clean tax standing is required for most grants.",
    due_date: `${CURRENT_YEAR + 1}-04-15`,
    reminder_days: [60, 30],
    recurrence: "annual",
    risk_if_missed: "Tax delinquency blocks federal grants and many state/foundation programs.",
    action_url: "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online",
    auto_generated: true,
  });

  return events;
}

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split("T")[0];
}

function nextMonthFirst(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

function nextQuarterFirst(): string {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3) + 1;
  const nextQ = q >= 4 ? 0 : q;
  const year = nextQ === 0 ? d.getFullYear() + 1 : d.getFullYear();
  return `${year}-${String(nextQ * 3 + 1).padStart(2, "0")}-01`;
}
