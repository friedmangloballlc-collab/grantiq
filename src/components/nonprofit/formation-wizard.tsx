"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  Info,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepType =
  | "single_select"
  | "multi_select"
  | "text"
  | "textarea"
  | "checklist"
  | "form"
  | "info";

interface SelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
}

interface FormField {
  id: string;
  label: string;
  placeholder?: string;
  type?: string;
  hint?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
}

interface Step {
  id: string;
  phase: number;
  title: string;
  description: string;
  type: StepType;
  tip?: string;
  options?: SelectOption[];
  fields?: FormField[];
  items?: ChecklistItem[];
  textLabel?: string;
  textPlaceholder?: string;
}

interface Phase {
  id: number;
  title: string;
  steps: number[];
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const PHASES: Phase[] = [
  { id: 1, title: "Determine Nonprofit Type", steps: [1, 2] },
  { id: 2, title: "Pre-Formation Checklist", steps: [3, 4, 5, 6, 7, 8] },
  { id: 3, title: "State Filing Steps", steps: [9, 10, 11, 12, 13, 14] },
  { id: 4, title: "Federal Tax-Exempt Status", steps: [15, 16, 17] },
  { id: 5, title: "Post-Formation Setup", steps: [18, 19] },
];

const STEPS: Step[] = [
  // Phase 1
  {
    id: "mission_type",
    phase: 1,
    title: "What is your primary mission?",
    description:
      "Select the option that best describes what your organization will primarily do. This determines your nonprofit classification.",
    type: "single_select",
    tip: "Most charitable organizations qualify as 501(c)(3). Choose the category that best fits your primary purpose — you can always consult an attorney to confirm.",
    options: [
      {
        value: "501c3",
        label: "Charitable, educational, religious, or scientific",
        description:
          "Classic nonprofits serving the public good — schools, churches, food banks, research orgs.",
        badge: "501(c)(3)",
      },
      {
        value: "501c4",
        label: "Heavy lobbying and political advocacy",
        description:
          "Organizations focused on social welfare with significant lobbying activity.",
        badge: "501(c)(4)",
      },
      {
        value: "501c6",
        label: "Promoting a specific industry or profession",
        description:
          "Trade associations, chambers of commerce, and professional organizations.",
        badge: "501(c)(6)",
      },
      {
        value: "501c7",
        label: "Social or recreational activities for members",
        description: "Social clubs, hobby groups, and recreational organizations.",
        badge: "501(c)(7)",
      },
      {
        value: "501c19",
        label: "Serving veterans and their families",
        description:
          "Posts and organizations serving current and former members of the armed forces.",
        badge: "501(c)(19)",
      },
      {
        value: "501c3_c4",
        label: "Both charity AND advocacy",
        description:
          "Dual-entity structure — a 501(c)(3) for charitable work and a 501(c)(4) affiliate for advocacy.",
        badge: "501(c)(3) + (c)(4)",
      },
    ],
  },
  {
    id: "type_confirmation",
    phase: 1,
    title: "Your Nonprofit Classification",
    description:
      "Based on your mission, here is the recommended classification with key details.",
    type: "info",
    tip: "Review the pros and cons carefully. The 501(c)(3) classification provides the most grant-funding opportunities but comes with restrictions on political activity.",
  },
  // Phase 2
  {
    id: "np_mission",
    phase: 2,
    title: "Write Your Mission Statement",
    description:
      "A strong mission statement is 1–3 sentences that clearly describe who you serve, what you do, and why it matters.",
    type: "textarea",
    textLabel: "Mission Statement",
    textPlaceholder:
      "e.g., \"Hope Community Foundation empowers underserved youth in Atlanta through after-school education, mentorship, and workforce development programs — because every child deserves a path to opportunity.\"",
    tip: "Keep it clear, specific, and inspiring. Avoid jargon. Your IRS application will ask for this.",
  },
  {
    id: "np_legal_name",
    phase: 2,
    title: "Choose Your Legal Name",
    description:
      "This is the official name that will appear on your articles of incorporation and all legal documents.",
    type: "text",
    textLabel: "Proposed Legal Name",
    textPlaceholder: "e.g., Hope Community Foundation, Inc.",
    tip: "Most states require a designator: Inc., Corp., Corporation, or Incorporated. Check your state's requirements. Search your state database to confirm availability before filing.",
  },
  {
    id: "np_state",
    phase: 2,
    title: "State of Incorporation",
    description:
      "Choose the state where you will file your articles of incorporation. Most organizations incorporate in the state where they primarily operate.",
    type: "single_select",
    tip: "While Delaware and Nevada are popular for for-profits, nonprofits generally should incorporate in their home state to avoid additional registration and fees.",
    options: [
      "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
      "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
      "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
      "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
      "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
      "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
      "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
      "Wisconsin","Wyoming","District of Columbia",
    ].map((s) => ({ value: s.toLowerCase().replace(/\s/g, "_"), label: s })),
  },
  {
    id: "np_board",
    phase: 2,
    title: "Board of Directors",
    description:
      "Most states require a minimum of 3 board members. Your board provides governance and oversight of the organization.",
    type: "form",
    tip: "Board members should be independent (not family members of staff), committed to the mission, and ideally bring diverse skills — legal, financial, community, and programmatic.",
    fields: [
      { id: "np_board_count", label: "Number of Board Members", placeholder: "3", type: "number", hint: "Minimum 3 recommended" },
      { id: "np_board_1", label: "Board Member 1 (Name)", placeholder: "Full name" },
      { id: "np_board_2", label: "Board Member 2 (Name)", placeholder: "Full name" },
      { id: "np_board_3", label: "Board Member 3 (Name)", placeholder: "Full name" },
    ],
  },
  {
    id: "np_officers",
    phase: 2,
    title: "Officers",
    description:
      "Officers handle day-to-day operations. The three required officers are President (or Executive Director), Secretary, and Treasurer.",
    type: "form",
    tip: "Officers can also serve as board members. The same person generally cannot hold two officer positions simultaneously. Treasurer and Secretary are often separate individuals.",
    fields: [
      { id: "np_officer_president", label: "President / Executive Director", placeholder: "Full name" },
      { id: "np_officer_secretary", label: "Secretary", placeholder: "Full name" },
      { id: "np_officer_treasurer", label: "Treasurer", placeholder: "Full name" },
    ],
  },
  {
    id: "np_fiscal_year",
    phase: 2,
    title: "Fiscal Year",
    description:
      "Your fiscal year determines your accounting period and when annual reports are due.",
    type: "single_select",
    tip: "Calendar year (Jan–Dec) is the most common and simplest. If your programs run on a grant cycle or academic year, a custom fiscal year may make more sense.",
    options: [
      { value: "calendar", label: "Calendar Year", description: "January 1 – December 31" },
      { value: "july_june", label: "July – June", description: "July 1 – June 30 (common for education)" },
      { value: "oct_sep", label: "October – September", description: "October 1 – September 30 (federal fiscal year)" },
      { value: "custom", label: "Custom", description: "I'll define my own fiscal year end date" },
    ],
  },
  // Phase 3
  {
    id: "np_name_search",
    phase: 3,
    title: "Name Availability Search",
    description:
      "Before filing, confirm your proposed name is available in your state's business entity database.",
    type: "checklist",
    tip: "Search your state's Secretary of State website. Also check trademark databases (USPTO.gov) and domain availability for your future website.",
    items: [
      { id: "searched_state", label: "Searched state Secretary of State database", description: "Visit sos.[yourstate].gov and search business entities" },
      { id: "no_conflict", label: "No conflicting names found", description: "Name is available or sufficiently distinct" },
      { id: "searched_trademark", label: "Checked USPTO trademark database", description: "Visit tmsearch.uspto.gov" },
      { id: "checked_domain", label: "Checked domain name availability", description: "Your .org domain is available" },
      { id: "reserved_name", label: "Reserved the name (optional)", description: "Many states allow name reservations for 30–120 days" },
    ],
  },
  {
    id: "np_articles",
    phase: 3,
    title: "Articles of Incorporation — Required Clauses",
    description:
      "Your Articles of Incorporation must include specific language for IRS approval. Check each clause you have included.",
    type: "checklist",
    tip: "The IRS requires specific dissolution and purpose language. Using boilerplate language from your state's nonprofit template is a safe starting point.",
    items: [
      { id: "clause_name", label: "Legal name of the corporation", description: "Exact name with required state designator" },
      { id: "clause_purpose", label: "IRS-compliant purpose clause", description: "\"...organized and operated exclusively for charitable, educational...\" purposes" },
      { id: "clause_dissolution", label: "Dissolution clause", description: "Assets go to another 501(c)(3) upon dissolution — required for IRS approval" },
      { id: "clause_inurement", label: "Private inurement prohibition", description: "No part of net earnings inures to any private individual" },
      { id: "clause_political", label: "Political activity restriction", description: "No substantial part of activities is carrying on propaganda or political campaigning" },
      { id: "clause_agent", label: "Registered agent name and address", description: "In-state registered agent for legal notices" },
      { id: "clause_directors", label: "Initial board of directors", description: "Names and addresses of at least 3 initial directors" },
    ],
  },
  {
    id: "np_state_filing",
    phase: 3,
    title: "File with the State",
    description:
      "Submit your Articles of Incorporation to your state's Secretary of State office. Track your filing status below.",
    type: "form",
    tip: "Filing fees vary by state ($20–$125 for most nonprofits). Processing time is typically 1–4 weeks. Expedited filing is available in most states for an additional fee.",
    fields: [
      { id: "np_filing_status", label: "Filing Status", placeholder: "e.g., Submitted, Pending, Approved" },
      { id: "np_filing_date", label: "Date Filed", placeholder: "MM/DD/YYYY", type: "date" },
      { id: "np_filing_confirmation", label: "Confirmation / Document Number", placeholder: "e.g., 20240101-1234567" },
      { id: "np_filing_fee", label: "Filing Fee Paid ($)", placeholder: "e.g., 50", type: "number" },
    ],
  },
  {
    id: "np_ein",
    phase: 3,
    title: "Obtain Your EIN",
    description:
      "An Employer Identification Number (EIN) is required before applying for tax-exempt status, opening a bank account, or hiring employees.",
    type: "form",
    tip: "Apply online at IRS.gov/EIN — it's free and takes about 15 minutes. You'll receive your EIN immediately upon completion. Print and save your confirmation letter (CP 575).",
    fields: [
      { id: "np_ein_applied", label: "EIN Application Status", placeholder: "e.g., Applied, Received" },
      { id: "np_ein_number", label: "EIN (once received)", placeholder: "XX-XXXXXXX", hint: "Format: 12-3456789" },
      { id: "np_ein_date", label: "Date Received", placeholder: "MM/DD/YYYY", type: "date" },
    ],
  },
  {
    id: "np_bylaws",
    phase: 3,
    title: "Draft Your Bylaws",
    description:
      "Bylaws are your organization's internal operating rules. Check each article you have included in your bylaws.",
    type: "checklist",
    tip: "Bylaws should be approved at your organizational meeting. Keep them in your corporate records book along with your articles and IRS determination letter.",
    items: [
      { id: "bylaw_name", label: "Article 1: Name and Purpose", description: "Legal name and mission of the organization" },
      { id: "bylaw_membership", label: "Article 2: Membership (if any)", description: "Whether organization has formal members and their rights" },
      { id: "bylaw_board", label: "Article 3: Board of Directors", description: "Size, terms, election, removal, and vacancies" },
      { id: "bylaw_meetings", label: "Article 4: Meetings", description: "Annual meeting, special meetings, quorum requirements, voting" },
      { id: "bylaw_officers", label: "Article 5: Officers", description: "Titles, duties, terms, and removal of officers" },
      { id: "bylaw_committees", label: "Article 6: Committees", description: "Standing and ad hoc committees, their authority" },
      { id: "bylaw_finances", label: "Article 7: Finances", description: "Fiscal year, bank accounts, signatures, audits" },
      { id: "bylaw_conflict", label: "Article 8: Conflict of Interest", description: "Disclosure requirements and recusal procedures" },
      { id: "bylaw_indemnification", label: "Article 9: Indemnification", description: "Protection for directors, officers, and employees" },
      { id: "bylaw_records", label: "Article 10: Corporate Records", description: "Minute books, registers, and inspection rights" },
      { id: "bylaw_amendment", label: "Article 11: Amendment Procedures", description: "How bylaws can be changed and vote required" },
    ],
  },
  {
    id: "np_org_meeting",
    phase: 3,
    title: "Hold Your Organizational Meeting",
    description:
      "The organizational meeting formally establishes the nonprofit. Check each agenda item as it is completed.",
    type: "checklist",
    tip: "Record detailed minutes of this meeting — they are a required document for your IRS application. Have all board members sign an attendance sheet.",
    items: [
      { id: "meet_call", label: "Call to order and roll call", description: "Record date, time, location, and who attended" },
      { id: "meet_articles", label: "Accept Articles of Incorporation", description: "Board votes to accept the filed articles" },
      { id: "meet_bylaws", label: "Adopt bylaws", description: "Board votes to adopt the organization's bylaws" },
      { id: "meet_officers", label: "Elect officers", description: "Board elects President, Secretary, and Treasurer" },
      { id: "meet_ein", label: "Ratify EIN application", description: "Board ratifies obtaining the Employer Identification Number" },
      { id: "meet_bank", label: "Authorize bank account", description: "Board authorizes opening a bank account and names authorized signers" },
      { id: "meet_fiscal", label: "Establish fiscal year", description: "Board confirms the organization's fiscal year end date" },
      { id: "meet_coi", label: "Adopt conflict of interest policy", description: "Board adopts and signs conflict of interest disclosures" },
      { id: "meet_compensation", label: "Set initial compensation policy", description: "Board establishes how officer/employee compensation will be set" },
      { id: "meet_registered", label: "Designate registered agent", description: "Confirm the registered agent for service of process" },
      { id: "meet_1023", label: "Authorize IRS application", description: "Board authorizes filing Form 1023 or 1023-EZ" },
      { id: "meet_minutes", label: "Approve and sign meeting minutes", description: "Secretary prepares and board approves the minutes" },
    ],
  },
  // Phase 4
  {
    id: "np_form_type",
    phase: 4,
    title: "Determine Which IRS Form to File",
    description:
      "Answer these eligibility questions to determine whether you qualify for the simplified Form 1023-EZ.",
    type: "checklist",
    tip: "Form 1023-EZ costs $275 and is processed faster (typically 2–4 weeks). Form 1023 costs $600 and can take 3–6 months. If you qualify for EZ, use it.",
    items: [
      { id: "ez_revenue", label: "Annual gross receipts are (or projected to be) $50,000 or less for first 3 years", description: "If yes, you may qualify for 1023-EZ" },
      { id: "ez_assets", label: "Total assets are less than $250,000", description: "If yes, you may qualify for 1023-EZ" },
      { id: "ez_us", label: "Organization is formed in the United States", description: "Required for 1023-EZ" },
      { id: "ez_not_hospital", label: "Not a hospital, school, or supporting organization", description: "These types must use Form 1023" },
      { id: "ez_not_church", label: "Not a church or church-related organization", description: "Churches may file 1023 or can self-declare" },
    ],
  },
  {
    id: "np_gather_docs",
    phase: 4,
    title: "Gather Required Documents",
    description:
      "Collect all documents needed for your IRS application before you begin. Check each item as you obtain it.",
    type: "checklist",
    tip: "Having all documents ready before starting the IRS application saves significant time. The application can take 3–12 hours to complete depending on the form.",
    items: [
      { id: "doc_articles", label: "Signed, filed Articles of Incorporation", description: "State-stamped copy with filing date" },
      { id: "doc_bylaws", label: "Adopted bylaws", description: "Board-approved copy with adoption date" },
      { id: "doc_coi", label: "Conflict of interest policy", description: "Signed by all board members" },
      { id: "doc_ein", label: "EIN confirmation letter (CP 575)", description: "Or SS-4 confirmation from IRS" },
      { id: "doc_minutes", label: "Organizational meeting minutes", description: "Signed and dated copy" },
      { id: "doc_officers", label: "Officers and directors list", description: "Names, addresses, titles, and hours per week" },
      { id: "doc_narrative", label: "Program narrative (activities description)", description: "Detailed description of each program/activity" },
      { id: "doc_financials", label: "Financial statements or projections", description: "3 years of actual or projected income/expenses" },
      { id: "doc_1023", label: "Completed Form 1023 or 1023-EZ", description: "Available on IRS.gov" },
    ],
  },
  {
    id: "np_irs_submit",
    phase: 4,
    title: "Submit to the IRS & Track Status",
    description:
      "File your application through Pay.gov and track the status of your determination letter.",
    type: "form",
    tip: "After submission, you can check status at IRS.gov/charities using your EIN. Response times vary: 1023-EZ typically 2–4 weeks; Form 1023 can take 3–6+ months.",
    fields: [
      { id: "np_irs_form", label: "Form Filed", placeholder: "1023-EZ or 1023" },
      { id: "np_irs_submit_date", label: "Date Submitted", placeholder: "MM/DD/YYYY", type: "date" },
      { id: "np_irs_confirmation", label: "Pay.gov Confirmation Number", placeholder: "e.g., 26-1234567890" },
      { id: "np_irs_determination", label: "Determination Letter Received", placeholder: "Yes / No / Pending" },
      { id: "np_irs_determination_date", label: "Date of Determination Letter", placeholder: "MM/DD/YYYY", type: "date" },
    ],
  },
  // Phase 5
  {
    id: "np_state_registrations",
    phase: 5,
    title: "State & Local Registrations",
    description:
      "After receiving your federal determination letter, complete these additional state and local registrations.",
    type: "checklist",
    tip: "Most states require nonprofits to register before soliciting charitable contributions. Failure to register can result in fines and penalties.",
    items: [
      { id: "state_tax_exempt", label: "Apply for state income tax exemption", description: "Most states automatically grant this after IRS approval; some require a separate application" },
      { id: "state_sales_tax", label: "Apply for sales tax exemption", description: "Required in most states to purchase goods tax-free" },
      { id: "state_charitable", label: "Register for charitable solicitation", description: "Required in ~40 states before fundraising — visit CharitiesSearch.sos.[yourstate].gov" },
      { id: "local_business", label: "Obtain local business license (if required)", description: "Check your city/county requirements" },
      { id: "foreign_registration", label: "Register in other states where you operate", description: "Required if you have employees, offices, or solicit donations in other states" },
    ],
  },
  {
    id: "np_operations",
    phase: 5,
    title: "Set Up Operations",
    description:
      "Complete these operational setup tasks to launch your nonprofit and begin applying for grants.",
    type: "checklist",
    tip: "Completing SAM.gov registration (free) is essential for federal grants. It takes 7–10 days to activate. Register early so you're ready when opportunities arise.",
    items: [
      { id: "ops_bank", label: "Open nonprofit bank account", description: "Use your EIN and articles of incorporation — most banks require both" },
      { id: "ops_accounting", label: "Set up accounting software", description: "QuickBooks Nonprofit or Sage Intacct are common choices" },
      { id: "ops_sam", label: "Register on SAM.gov", description: "Required for ALL federal grants and contracts — free registration, 7–10 days to activate" },
      { id: "ops_grants_gov", label: "Create Grants.gov account", description: "Required to apply for federal grants" },
      { id: "ops_guidestar", label: "Claim/create Candid (GuideStar) profile", description: "Increases credibility with foundation funders" },
      { id: "ops_website", label: "Launch organizational website", description: "Include mission, programs, board, and donation page" },
      { id: "ops_insurance", label: "Obtain Directors & Officers (D&O) insurance", description: "Protects board members from personal liability" },
      { id: "ops_bylaws_review", label: "Annual review of bylaws scheduled", description: "Calendar a yearly governance review" },
      { id: "ops_990", label: "Prepare for Form 990 filing", description: "Due annually — consult a CPA familiar with nonprofits" },
      { id: "ops_grantiq", label: "Complete GrantIQ profile for grant matching", description: "Enable AI-powered grant discovery based on your new nonprofit profile" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPhaseForStep(stepNum: number): Phase {
  return PHASES.find((p) => p.steps.includes(stepNum)) ?? PHASES[0];
}

function getPhaseProgress(phase: Phase, completedSteps: Set<number>): number {
  const done = phase.steps.filter((s) => completedSteps.has(s)).length;
  return Math.round((done / phase.steps.length) * 100);
}

// ---------------------------------------------------------------------------
// Classification info lookup
// ---------------------------------------------------------------------------

const TYPE_INFO: Record<string, { title: string; pros: string[]; cons: string[] }> = {
  "501c3": {
    title: "501(c)(3) — Charitable Organization",
    pros: [
      "Donations are tax-deductible to donors",
      "Eligible for the widest range of grants (federal, foundation, corporate)",
      "Exempt from federal income tax",
      "Reduced postal rates and other discounts",
    ],
    cons: [
      "Cannot engage in substantial lobbying",
      "Cannot participate in political campaigns",
      "Annual Form 990 required (public disclosure)",
      "Private inurement strictly prohibited",
    ],
  },
  "501c4": {
    title: "501(c)(4) — Social Welfare Organization",
    pros: [
      "Can engage in substantial lobbying",
      "Exempt from federal income tax",
      "More political activity permitted than 501(c)(3)",
    ],
    cons: [
      "Donations are NOT tax-deductible to donors",
      "Very limited grant funding available",
      "Subject to DISCLOSE Act disclosure rules",
    ],
  },
  "501c6": {
    title: "501(c)(6) — Trade or Professional Association",
    pros: [
      "Can advocate for members' business interests",
      "Can engage in significant lobbying",
      "Dues from members can be the primary revenue",
    ],
    cons: [
      "Donations are NOT generally tax-deductible",
      "Limited grant eligibility",
      "Must serve collective business interests, not the public",
    ],
  },
  "501c7": {
    title: "501(c)(7) — Social or Recreational Club",
    pros: [
      "Tax-exempt on income related to exempt function",
      "Membership dues not subject to income tax",
    ],
    cons: [
      "Must serve members, not the public",
      "Very limited grant eligibility",
      "At least 65% of income must be from members",
    ],
  },
  "501c19": {
    title: "501(c)(19) — Veterans Organization",
    pros: [
      "Tax-exempt status for veterans service",
      "Donations may be tax-deductible",
      "Special grant opportunities through VA and veteran funders",
    ],
    cons: [
      "75% of members must be war veterans",
      "Specific eligibility requirements",
    ],
  },
  "501c3_c4": {
    title: "Dual Structure: 501(c)(3) + 501(c)(4)",
    pros: [
      "Charitable wing gets tax-deductible donations and grant access",
      "Advocacy wing can lobby without restriction",
      "Maximizes both fundraising and political effectiveness",
    ],
    cons: [
      "Requires two separate legal entities",
      "More complex governance and accounting",
      "Shared-cost allocations must be carefully documented",
      "Higher administrative burden",
    ],
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TipBox({ tip }: { tip: string }) {
  return (
    <div className="flex gap-3 bg-brand-teal/5 border border-brand-teal/20 rounded-lg p-4 mt-4">
      <Info className="h-4 w-4 text-brand-teal mt-0.5 shrink-0" />
      <p className="text-sm text-warm-600">{tip}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface FormationWizardProps {
  initialData?: Record<string, unknown>;
}

export function FormationWizard({ initialData = {} }: FormationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialData);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const step = STEPS[currentStep - 1];
  const currentPhase = getPhaseForStep(currentStep);
  const totalSteps = STEPS.length;

  // Persist a field to the backend
  const saveField = useCallback(async (field: string, value: unknown) => {
    try {
      await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value }),
      });
    } catch {
      // Non-blocking — UI should not fail on save errors
    }
  }, []);

  // Mark step complete, save progress, advance
  const handleComplete = async () => {
    setSaving(true);
    setCompletedSteps((prev) => new Set([...prev, currentStep]));

    // Save step-level answer
    if (step.type === "single_select" && answers[step.id]) {
      await saveField(`np_${step.id}`, answers[step.id]);
    } else if (step.type === "textarea" || step.type === "text") {
      if (answers[step.id]) {
        await saveField(step.id as string, answers[step.id]);
      }
    } else if (step.type === "form" && step.fields) {
      for (const f of step.fields) {
        if (answers[f.id]) {
          await saveField(f.id, answers[f.id]);
        }
      }
    } else if (step.type === "checklist" && step.items) {
      const completed = step.items.filter((item) => checklistState[item.id]).map((i) => i.id);
      await saveField(`np_checklist_${step.id}`, completed.join(","));
    }

    // Save step number
    await saveField("np_formation_step", currentStep + 1);

    setSaving(false);
    setSaveMsg("Saved!");
    setTimeout(() => setSaveMsg(""), 2000);

    if (currentStep < totalSteps) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  // Determine classification from mission_type answer
  const classificationKey = (answers["mission_type"] as string) ?? "501c3";
  const classInfo = TYPE_INFO[classificationKey] ?? TYPE_INFO["501c3"];

  // Overall progress
  const overallPct = Math.round((completedSteps.size / totalSteps) * 100);

  return (
    <div className="flex min-h-screen bg-warm-50">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-warm-200 bg-white">
        <div className="p-6 border-b border-warm-100">
          <p className="text-xs font-semibold text-warm-400 uppercase tracking-wide">Overall Progress</p>
          <div className="mt-2 h-2 bg-warm-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-teal rounded-full transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <p className="text-sm text-warm-500 mt-1">{overallPct}% complete</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-4">
          {PHASES.map((phase) => {
            const isActive = phase.id === currentPhase.id;
            const phaseStepsDone = phase.steps.filter((s) => completedSteps.has(s)).length;
            const phaseDone = phaseStepsDone === phase.steps.length;

            return (
              <div key={phase.id}>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-brand-teal/10 text-brand-teal"
                      : phaseDone
                      ? "text-warm-400"
                      : "text-warm-500"
                  }`}
                >
                  {phaseDone ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <span
                      className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold shrink-0 ${
                        isActive ? "bg-brand-teal text-white" : "bg-warm-200 text-warm-500"
                      }`}
                    >
                      {phase.id}
                    </span>
                  )}
                  Phase {phase.id}: {phase.title}
                </div>

                {isActive && (
                  <div className="ml-7 mt-1 space-y-1">
                    {phase.steps.map((stepNum) => {
                      const s = STEPS[stepNum - 1];
                      const isCurrent = stepNum === currentStep;
                      const isDone = completedSteps.has(stepNum);
                      return (
                        <button
                          key={stepNum}
                          onClick={() => setCurrentStep(stepNum)}
                          className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                            isCurrent
                              ? "bg-brand-teal/10 text-brand-teal font-medium"
                              : isDone
                              ? "text-warm-400"
                              : "text-warm-500 hover:text-warm-700"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                          ) : (
                            <Circle className={`h-3 w-3 shrink-0 ${isCurrent ? "text-brand-teal" : "text-warm-300"}`} />
                          )}
                          {s.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10">
          {/* Phase badge */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-semibold text-brand-teal bg-brand-teal/10 px-2.5 py-1 rounded-full">
              Phase {currentPhase.id}: {currentPhase.title}
            </span>
            <span className="text-xs text-warm-400">
              Step {currentStep} of {totalSteps}
            </span>
          </div>

          {/* Step header */}
          <h1 className="text-2xl font-bold text-warm-900 mb-2">{step.title}</h1>
          <p className="text-warm-500 mb-6">{step.description}</p>

          {/* Step content */}
          <div className="bg-white rounded-xl border border-warm-200 p-6 shadow-sm">
            {/* SINGLE SELECT */}
            {step.type === "single_select" && step.options && (
              <div className="space-y-3">
                {step.options.map((opt) => {
                  const selected = answers[step.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setAnswers((prev) => ({ ...prev, [step.id]: opt.value }))}
                      className={`w-full text-left border rounded-lg p-4 transition-all ${
                        selected
                          ? "border-brand-teal bg-brand-teal/5 ring-1 ring-brand-teal"
                          : "border-warm-200 hover:border-brand-teal/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-warm-900 text-sm">{opt.label}</p>
                          {opt.description && (
                            <p className="text-xs text-warm-500 mt-1">{opt.description}</p>
                          )}
                        </div>
                        {opt.badge && (
                          <span className="shrink-0 text-xs font-bold text-brand-teal bg-brand-teal/10 px-2 py-0.5 rounded">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* INFO (type confirmation) */}
            {step.type === "info" && (
              <div>
                <h2 className="text-lg font-bold text-warm-900 mb-1">{classInfo.title}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Advantages</p>
                    <ul className="space-y-2">
                      {classInfo.pros.map((pro) => (
                        <li key={pro} className="flex items-start gap-2 text-sm text-warm-700">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Limitations</p>
                    <ul className="space-y-2">
                      {classInfo.cons.map((con) => (
                        <li key={con} className="flex items-start gap-2 text-sm text-warm-700">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="text-sm text-warm-500 mt-5">
                  This classification was determined based on your selection in the previous step. If this doesn&apos;t look right, go back and change your mission type.
                </p>
              </div>
            )}

            {/* TEXTAREA */}
            {(step.type === "textarea" || step.type === "text") && (
              <div>
                <Label className="text-sm font-medium text-warm-700 mb-1.5 block">
                  {step.textLabel}
                </Label>
                {step.type === "textarea" ? (
                  <textarea
                    rows={5}
                    value={(answers[step.id] as string) ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [step.id]: e.target.value }))
                    }
                    placeholder={step.textPlaceholder}
                    className="w-full border border-warm-200 rounded-lg px-3 py-2 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-brand-teal/40 resize-y min-h-[120px]"
                  />
                ) : (
                  <Input
                    value={(answers[step.id] as string) ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [step.id]: e.target.value }))
                    }
                    placeholder={step.textPlaceholder}
                  />
                )}
              </div>
            )}

            {/* FORM (multiple fields) */}
            {step.type === "form" && step.fields && (
              <div className="space-y-4">
                {step.fields.map((field) => (
                  <div key={field.id}>
                    <Label className="text-sm font-medium text-warm-700 mb-1 block">
                      {field.label}
                    </Label>
                    <Input
                      type={field.type ?? "text"}
                      value={(answers[field.id] as string) ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                    />
                    {field.hint && (
                      <p className="text-xs text-warm-400 mt-1">{field.hint}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* CHECKLIST */}
            {step.type === "checklist" && step.items && (
              <div className="space-y-3">
                {step.items.map((item) => {
                  const checked = checklistState[item.id] ?? false;
                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition-all ${
                        checked
                          ? "border-green-300 bg-green-50"
                          : "border-warm-200 hover:border-warm-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setChecklistState((prev) => ({
                            ...prev,
                            [item.id]: e.target.checked,
                          }))
                        }
                        className="mt-0.5 h-4 w-4 accent-brand-teal shrink-0"
                      />
                      <div>
                        <p className={`text-sm font-medium ${checked ? "text-green-700 line-through" : "text-warm-900"}`}>
                          {item.label}
                        </p>
                        {item.description && (
                          <p className="text-xs text-warm-500 mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
                {step.items.length > 0 && (
                  <p className="text-xs text-warm-400 pt-2">
                    {step.items.filter((i) => checklistState[i.id]).length} of {step.items.length} items completed
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tip */}
          {step.tip && <TipBox tip={step.tip} />}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              {saveMsg && (
                <span className="text-xs text-green-600 font-medium">{saveMsg}</span>
              )}
              {currentStep < totalSteps ? (
                <Button
                  onClick={handleComplete}
                  disabled={saving}
                  className="bg-brand-teal hover:bg-brand-teal-dark text-white flex items-center gap-1.5"
                >
                  {saving ? "Saving..." : "Mark Complete & Continue"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5"
                >
                  {saving ? "Saving..." : "Complete Formation Guide"}
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Mobile phase indicator */}
          <div className="lg:hidden mt-8 pt-6 border-t border-warm-200">
            <p className="text-xs font-semibold text-warm-400 uppercase tracking-wide mb-3">All Phases</p>
            <div className="flex gap-2 flex-wrap">
              {PHASES.map((phase) => {
                const isActive = phase.id === currentPhase.id;
                const pct = getPhaseProgress(phase, completedSteps);
                return (
                  <div
                    key={phase.id}
                    className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${
                      isActive
                        ? "border-brand-teal text-brand-teal bg-brand-teal/5"
                        : pct === 100
                        ? "border-green-300 text-green-600 bg-green-50"
                        : "border-warm-200 text-warm-500"
                    }`}
                  >
                    {pct === 100 && <CheckCircle2 className="h-3 w-3" />}
                    P{phase.id}: {phase.title}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
