"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Upload,
  CheckSquare,
  Square,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Phase {
  id: number;
  title: string;
  stepIds: string[];
}

interface SelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
}

interface PackageOption {
  value: string;
  label: string;
  price: number;
  priceDisplay: string;
  features: string[];
  highlight?: boolean;
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

const PHASES: Phase[] = [
  { id: 1, title: "About You",            stepIds: ["contact", "mission", "org_details"] },
  { id: 2, title: "Leadership",           stepIds: ["board", "officers"] },
  { id: 3, title: "Financials & Programs",stepIds: ["financials", "programs", "populations"] },
  { id: 4, title: "Current Status",       stepIds: ["existing_docs", "doc_upload"] },
  { id: 5, title: "Service Selection",    stepIds: ["package", "review"] },
];

const STEP_ORDER = PHASES.flatMap((p) => p.stepIds);

const PHASE_FOR_STEP: Record<string, number> = {};
PHASES.forEach((p) => p.stepIds.forEach((s) => (PHASE_FOR_STEP[s] = p.id)));

// ---------------------------------------------------------------------------
// US States
// ---------------------------------------------------------------------------

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming","District of Columbia",
];

// ---------------------------------------------------------------------------
// Mission purpose options
// ---------------------------------------------------------------------------

const MISSION_OPTIONS: SelectOption[] = [
  {
    value: "501c3",
    label: "Charitable, educational, or scientific work",
    description: "Schools, food banks, research orgs, faith-based programs serving the public.",
    badge: "501(c)(3)",
  },
  {
    value: "501c4",
    label: "Advocacy and political action",
    description: "Social welfare organizations with significant lobbying or advocacy activity.",
    badge: "501(c)(4)",
  },
  {
    value: "501c6",
    label: "Professional or industry association",
    description: "Trade associations, chambers of commerce, professional organizations.",
    badge: "501(c)(6)",
  },
  {
    value: "501c7",
    label: "Social or recreational club",
    description: "Social clubs, hobby groups, and member-benefit recreational organizations.",
    badge: "501(c)(7)",
  },
  {
    value: "501c19",
    label: "Veterans services",
    description: "Organizations serving current and former members of the armed forces.",
    badge: "501(c)(19)",
  },
  {
    value: "unsure",
    label: "I'm not sure — help me decide",
    description: "Our team will assess your mission and recommend the right structure.",
    badge: "We'll advise",
  },
];

// ---------------------------------------------------------------------------
// Populations options
// ---------------------------------------------------------------------------

const POPULATION_OPTIONS: SelectOption[] = [
  { value: "children_youth",   label: "Children / Youth" },
  { value: "adults",           label: "Adults" },
  { value: "seniors",          label: "Seniors" },
  { value: "families",         label: "Families" },
  { value: "veterans",         label: "Veterans" },
  { value: "homeless",         label: "Homeless / Housing Insecure" },
  { value: "disabled",         label: "People with Disabilities" },
  { value: "immigrants",       label: "Immigrants / Refugees" },
  { value: "low_income",       label: "Low-Income Individuals" },
  { value: "lgbtq",            label: "LGBTQ+" },
  { value: "minorities",       label: "Racial / Ethnic Minorities" },
  { value: "general_public",   label: "General Public" },
  { value: "animals",          label: "Animals" },
  { value: "environment",      label: "Environment" },
  { value: "other",            label: "Other" },
];

// ---------------------------------------------------------------------------
// Existing docs options
// ---------------------------------------------------------------------------

const EXISTING_DOC_OPTIONS: SelectOption[] = [
  { value: "articles",      label: "Articles of Incorporation (already filed)" },
  { value: "ein",           label: "EIN (already obtained)" },
  { value: "bylaws",        label: "Bylaws (already drafted)" },
  { value: "coi_policy",   label: "Conflict of Interest Policy" },
  { value: "bank_account",  label: "Bank Account (nonprofit)" },
  { value: "sam_gov",       label: "SAM.gov Registration" },
  { value: "grants_gov",    label: "Grants.gov Account" },
  { value: "website",       label: "Website" },
  { value: "none",          label: "None of these — starting from scratch" },
];

// ---------------------------------------------------------------------------
// Revenue source options
// ---------------------------------------------------------------------------

const REVENUE_OPTIONS: SelectOption[] = [
  { value: "donations",     label: "Donations" },
  { value: "grants",        label: "Grants" },
  { value: "membership",    label: "Membership Dues" },
  { value: "program_fees",  label: "Program Fees" },
  { value: "events",        label: "Events" },
  { value: "other",         label: "Other" },
];

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------

const PACKAGES: PackageOption[] = [
  {
    value: "formation",
    label: "Nonprofit Formation",
    price: 499,
    priceDisplay: "$499",
    features: [
      "State incorporation + Articles of Incorporation",
      "EIN application",
      "Bylaws drafting",
      "Conflict of Interest Policy",
      "Organizational meeting minutes template",
    ],
  },
  {
    value: "formation_501c3",
    label: "Formation + 501(c)(3)",
    price: 1499,
    priceDisplay: "$1,499",
    highlight: true,
    features: [
      "Everything in Formation package",
      "IRS Form 1023 or 1023-EZ preparation",
      "Financial projections preparation",
      "Narrative description writing",
      "IRS submission and tracking",
    ],
  },
  {
    value: "grant_ready",
    label: "Full Grant-Ready Package",
    price: 2999,
    priceDisplay: "$2,999",
    features: [
      "Everything in Formation + 501(c)(3)",
      "SAM.gov registration",
      "Grants.gov registration",
      "Grant readiness assessment",
      "First 3 grant matches via GrantAQ",
      "30-day advisory support",
    ],
  },
];

// ---------------------------------------------------------------------------
// Board member type
// ---------------------------------------------------------------------------

interface BoardMember {
  name: string;
  email: string;
  phone: string;
  relationship: string;
}

const EMPTY_BOARD_MEMBER = (): BoardMember => ({ name: "", email: "", phone: "", relationship: "" });

// ---------------------------------------------------------------------------
// Form data
// ---------------------------------------------------------------------------

interface FormData {
  // Step 1: Contact
  np_full_name: string;
  np_email: string;
  np_phone: string;
  np_contact_method: string;

  // Step 2: Mission
  np_mission_statement: string;
  np_primary_purpose: string;

  // Step 3: Org details
  np_org_name: string;
  np_state: string;
  np_city: string;
  np_launch_date: string;
  np_fiscal_year: string;

  // Step 4: Board
  np_board_members: BoardMember[];

  // Step 5: Officers
  np_president: string;
  np_secretary: string;
  np_treasurer: string;

  // Step 6: Financials
  np_year1_revenue: string;
  np_year1_expenses: string;
  np_revenue_sources: string[];
  np_compensate_officers: string;

  // Step 7: Programs
  np_programs_description: string;

  // Step 8: Populations
  np_populations: string[];

  // Step 9: Existing docs
  np_existing_docs: string[];

  // Step 10: Files (names only for display)
  np_uploaded_files: string[];

  // Step 11: Package
  np_package: string;
}

const INITIAL_FORM: FormData = {
  np_full_name: "",
  np_email: "",
  np_phone: "",
  np_contact_method: "",
  np_mission_statement: "",
  np_primary_purpose: "",
  np_org_name: "",
  np_state: "",
  np_city: "",
  np_launch_date: "",
  np_fiscal_year: "",
  np_board_members: [EMPTY_BOARD_MEMBER(), EMPTY_BOARD_MEMBER(), EMPTY_BOARD_MEMBER()],
  np_president: "",
  np_secretary: "",
  np_treasurer: "",
  np_year1_revenue: "",
  np_year1_expenses: "",
  np_revenue_sources: [],
  np_compensate_officers: "",
  np_programs_description: "",
  np_populations: [],
  np_existing_docs: [],
  np_uploaded_files: [],
  np_package: "",
};

// ---------------------------------------------------------------------------
// Save helper
// ---------------------------------------------------------------------------

async function saveField(field: string, value: unknown) {
  try {
    await fetch("/api/onboarding/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value }),
    });
  } catch {
    // Non-blocking — don't surface DB errors to user
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FormationWizard() {
  const [currentStepId, setCurrentStepId] = useState<string>("contact");
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, _setFileError] = useState("");

  // Pre-fill email from auth
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setForm((prev) => ({ ...prev, np_email: data.user!.email! }));
      }
    });
  }, []);

  const currentPhase = PHASE_FOR_STEP[currentStepId];
  const currentStepIndex = STEP_ORDER.indexOf(currentStepId);
  const totalSteps = STEP_ORDER.length;
  const progressPct = Math.round(((currentStepIndex) / (totalSteps - 1)) * 100);

  const canGoBack = currentStepIndex > 0;
  const canGoForward = currentStepIndex < totalSteps - 1;

  const goNext = useCallback(() => {
    if (canGoForward) setCurrentStepId(STEP_ORDER[currentStepIndex + 1]);
  }, [canGoForward, currentStepIndex]);

  const goBack = useCallback(() => {
    if (canGoBack) setCurrentStepId(STEP_ORDER[currentStepIndex - 1]);
  }, [canGoBack, currentStepIndex]);

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMulti(field: "np_revenue_sources" | "np_populations" | "np_existing_docs", value: string) {
    setForm((prev) => {
      const current = prev[field] as string[];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  }

  function updateBoardMember(index: number, key: keyof BoardMember, value: string) {
    setForm((prev) => {
      const members = [...prev.np_board_members];
      members[index] = { ...members[index], [key]: value };
      return { ...prev, np_board_members: members };
    });
  }

  function addBoardMember() {
    if (form.np_board_members.length < 5) {
      setForm((prev) => ({
        ...prev,
        np_board_members: [...prev.np_board_members, EMPTY_BOARD_MEMBER()],
      }));
    }
  }

  function removeBoardMember(index: number) {
    if (form.np_board_members.length > 3) {
      setForm((prev) => ({
        ...prev,
        np_board_members: prev.np_board_members.filter((_, i) => i !== index),
      }));
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    const names = files.map((f) => f.name);
    setForm((prev) => ({ ...prev, np_uploaded_files: [...prev.np_uploaded_files, ...names] }));
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const names = files.map((f) => f.name);
    setForm((prev) => ({ ...prev, np_uploaded_files: [...prev.np_uploaded_files, ...names] }));
  }

  function removeFile(index: number) {
    setForm((prev) => ({
      ...prev,
      np_uploaded_files: prev.np_uploaded_files.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    // Save all fields
    const saveAll = Object.entries(form).map(([key, val]) => saveField(key, val));
    await Promise.allSettled(saveAll);
    setSubmitting(false);
    setSubmitted(true);
  }

  // ---------------------------------------------------------------------------
  // Submitted screen
  // ---------------------------------------------------------------------------

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-teal-600" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground">Application Submitted!</h1>
            <p className="text-muted-foreground leading-relaxed">
              Our nonprofit formation team will review your information and contact you
              within <span className="font-semibold text-foreground">24 hours</span> to begin
              the process.
            </p>
            {form.np_email && (
              <p className="text-sm text-muted-foreground">
                Confirmation will be sent to <span className="font-medium">{form.np_email}</span>
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-left space-y-2">
            <p className="text-sm font-semibold text-foreground">What happens next:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• A formation specialist reviews your intake</li>
              <li>• We reach out to confirm scope and answer questions</li>
              <li>• You receive a service agreement and invoice</li>
              <li>• Work begins within 1-2 business days of payment</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <span className="font-semibold text-teal-600">GrantAQ</span>
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 lg:shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-muted/20 p-6">
        <div className="mb-6 hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Nonprofit Formation
          </p>
          <p className="text-sm font-bold text-teal-600">GrantAQ</p>
        </div>
        <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible">
          {PHASES.map((phase) => {
            const isActive = phase.id === currentPhase;
            const isComplete = phase.id < currentPhase;
            return (
              <button
                key={phase.id}
                onClick={() => {
                  // Allow navigating to complete phases
                  if (isComplete) setCurrentStepId(phase.stepIds[0]);
                }}
                className={[
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors text-left",
                  isActive
                    ? "bg-teal-600 text-white"
                    : isComplete
                    ? "text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 cursor-pointer"
                    : "text-muted-foreground cursor-default",
                ].join(" ")}
              >
                <span className="shrink-0">
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </span>
                <span>
                  <span className="text-xs opacity-70">Phase {phase.id}</span>
                  <br />
                  {phase.title}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col max-h-screen overflow-y-auto">
        {/* Progress bar */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
            <span>{progressPct}% complete</span>
          </div>
          <Progress value={progressPct} className="h-1.5" />
        </div>

        {/* Step content */}
        <div className="flex-1 px-6 py-6 max-w-2xl w-full mx-auto">
          <StepContent
            stepId={currentStepId}
            form={form}
            setField={setField}
            toggleMulti={toggleMulti}
            updateBoardMember={updateBoardMember}
            addBoardMember={addBoardMember}
            removeBoardMember={removeBoardMember}
            dragActive={dragActive}
            setDragActive={setDragActive}
            handleFileDrop={handleFileDrop}
            handleFileInput={handleFileInput}
            removeFile={removeFile}
            fileError={fileError}
            onSubmit={handleSubmit}
            submitting={submitting}
            goNext={goNext}
            goBack={goBack}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
          />
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepContent
// ---------------------------------------------------------------------------

interface StepContentProps {
  stepId: string;
  form: FormData;
  setField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  toggleMulti: (field: "np_revenue_sources" | "np_populations" | "np_existing_docs", value: string) => void;
  updateBoardMember: (index: number, key: keyof BoardMember, value: string) => void;
  addBoardMember: () => void;
  removeBoardMember: (index: number) => void;
  dragActive: boolean;
  setDragActive: (v: boolean) => void;
  handleFileDrop: (e: React.DragEvent) => void;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (index: number) => void;
  fileError: string;
  onSubmit: () => void;
  submitting: boolean;
  goNext: () => void;
  goBack: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

function StepContent(props: StepContentProps) {
  const { stepId } = props;

  switch (stepId) {
    case "contact":
      return <StepContact {...props} />;
    case "mission":
      return <StepMission {...props} />;
    case "org_details":
      return <StepOrgDetails {...props} />;
    case "board":
      return <StepBoard {...props} />;
    case "officers":
      return <StepOfficers {...props} />;
    case "financials":
      return <StepFinancials {...props} />;
    case "programs":
      return <StepPrograms {...props} />;
    case "populations":
      return <StepPopulations {...props} />;
    case "existing_docs":
      return <StepExistingDocs {...props} />;
    case "doc_upload":
      return <StepDocUpload {...props} />;
    case "package":
      return <StepPackage {...props} />;
    case "review":
      return <StepReview {...props} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Navigation footer
// ---------------------------------------------------------------------------

function NavFooter({
  onBack,
  onNext,
  canGoBack,
  canGoForward,
  nextLabel = "Continue",
  onNextDisabled = false,
}: {
  onBack: () => void;
  onNext: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  nextLabel?: string;
  onNextDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-8 border-t border-border mt-8">
      <Button
        variant="outline"
        onClick={onBack}
        disabled={!canGoBack}
        className="gap-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </Button>
      {canGoForward && (
        <Button
          onClick={onNext}
          disabled={onNextDisabled}
          className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
        >
          {nextLabel}
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Contact Information
// ---------------------------------------------------------------------------

function StepContact({ form, setField, goNext, goBack, canGoBack, canGoForward }: StepContentProps) {
  return (
    <div className="space-y-6">
      <StepHeader
        title="Contact Information"
        subtitle="Tell us how to reach you."
      />
      <div className="space-y-4">
        <FormRow label="Full Name" htmlFor="np_full_name" required>
          <Input
            id="np_full_name"
            value={form.np_full_name}
            onChange={(e) => setField("np_full_name", e.target.value)}
            placeholder="Jane Smith"
          />
        </FormRow>
        <FormRow label="Email Address" htmlFor="np_email" required>
          <Input
            id="np_email"
            type="email"
            value={form.np_email}
            onChange={(e) => setField("np_email", e.target.value)}
            placeholder="jane@example.com"
          />
        </FormRow>
        <FormRow label="Phone Number" htmlFor="np_phone">
          <Input
            id="np_phone"
            type="tel"
            value={form.np_phone}
            onChange={(e) => setField("np_phone", e.target.value)}
            placeholder="(555) 000-0000"
          />
        </FormRow>
        <FormRow label="Preferred Contact Method" htmlFor="np_contact_method">
          <div className="flex gap-3 flex-wrap">
            {["Email", "Phone", "Text"].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setField("np_contact_method", method.toLowerCase())}
                className={[
                  "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                  form.np_contact_method === method.toLowerCase()
                    ? "bg-teal-600 border-teal-600 text-white"
                    : "border-border text-foreground hover:border-teal-400",
                ].join(" ")}
              >
                {method}
              </button>
            ))}
          </div>
        </FormRow>
      </div>
      <NavFooter
        onBack={goBack}
        onNext={goNext}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onNextDisabled={!form.np_full_name || !form.np_email}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Mission
// ---------------------------------------------------------------------------

function StepMission({ form, setField, goNext, goBack, canGoBack, canGoForward }: StepContentProps) {
  return (
    <div className="space-y-6">
      <StepHeader
        title="Your Mission"
        subtitle="Help us understand what your organization will do."
      />
      <div className="space-y-6">
        <FormRow
          label="Describe your mission in 1–3 sentences — what will your organization do and who will it serve?"
          htmlFor="np_mission_statement"
          required
        >
          <Textarea
            id="np_mission_statement"
            value={form.np_mission_statement}
            onChange={(e) => setField("np_mission_statement", e.target.value)}
            placeholder="Our organization will provide after-school tutoring and mentorship to underserved youth in Atlanta, helping them achieve academic success and build life skills."
            rows={4}
          />
        </FormRow>
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Which best describes your primary purpose?{" "}
            <span className="text-destructive">*</span>
          </Label>
          <div className="space-y-3">
            {MISSION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setField("np_primary_purpose", opt.value)}
                className={[
                  "w-full text-left rounded-xl border p-4 transition-colors",
                  form.np_primary_purpose === opt.value
                    ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                    : "border-border hover:border-teal-300 bg-background",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                    {opt.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    )}
                  </div>
                  {opt.badge && (
                    <span className="shrink-0 text-xs font-mono bg-muted px-2 py-0.5 rounded border border-border text-muted-foreground">
                      {opt.badge}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <NavFooter
        onBack={goBack}
        onNext={goNext}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onNextDisabled={!form.np_mission_statement || !form.np_primary_purpose}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Org Details
// ---------------------------------------------------------------------------

function StepOrgDetails({ form, setField, goNext, goBack, canGoBack, canGoForward }: StepContentProps) {
  return (
    <div className="space-y-6">
      <StepHeader
        title="Organization Details"
        subtitle="Basic information about the organization you're forming."
      />
      <div className="space-y-4">
        <FormRow label="Proposed Organization Name" htmlFor="np_org_name" required>
          <Input
            id="np_org_name"
            value={form.np_org_name}
            onChange={(e) => setField("np_org_name", e.target.value)}
            placeholder="Hope Forward Foundation"
          />
        </FormRow>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="State of Incorporation" htmlFor="np_state" required>
            <select
              id="np_state"
              value={form.np_state}
              onChange={(e) => setField("np_state", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Select state…</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="City" htmlFor="np_city" required>
            <Input
              id="np_city"
              value={form.np_city}
              onChange={(e) => setField("np_city", e.target.value)}
              placeholder="Atlanta"
            />
          </FormRow>
        </div>
        <FormRow label="Expected Launch Date" htmlFor="np_launch_date">
          <Input
            id="np_launch_date"
            value={form.np_launch_date}
            onChange={(e) => setField("np_launch_date", e.target.value)}
            placeholder="e.g. July 2026, Q3 2026, ASAP"
          />
        </FormRow>
        <FormRow label="Fiscal Year" htmlFor="np_fiscal_year">
          <div className="flex gap-3 flex-wrap">
            {["Calendar year (Jan–Dec)", "Custom fiscal year"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setField("np_fiscal_year", option)}
                className={[
                  "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                  form.np_fiscal_year === option
                    ? "bg-teal-600 border-teal-600 text-white"
                    : "border-border text-foreground hover:border-teal-400",
                ].join(" ")}
              >
                {option}
              </button>
            ))}
          </div>
        </FormRow>
      </div>
      <NavFooter
        onBack={goBack}
        onNext={goNext}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onNextDisabled={!form.np_org_name || !form.np_state || !form.np_city}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Board of Directors
// ---------------------------------------------------------------------------

function StepBoard({ form, updateBoardMember, addBoardMember, removeBoardMember, goNext, goBack, canGoBack, canGoForward }: StepContentProps) {
  const boardValid = form.np_board_members
    .slice(0, 3)
    .every((m) => m.name.trim().length > 0);

  return (
    <div className="space-y-6">
      <StepHeader
        title="Board of Directors"
        subtitle="The IRS requires at least 3 unrelated individuals on your board."
      />
      <div className="space-y-6">
        {form.np_board_members.map((member, index) => (
          <div key={index} className="rounded-xl border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                Board Member {index + 1}
                {index < 3 && (
                  <span className="ml-2 text-xs text-destructive font-normal">Required</span>
                )}
              </p>
              {index >= 3 && (
                <button
                  type="button"
                  onClick={() => removeBoardMember(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Full Name" htmlFor={`board_name_${index}`} required={index < 3}>
                <Input
                  id={`board_name_${index}`}
                  value={member.name}
                  onChange={(e) => updateBoardMember(index, "name", e.target.value)}
                  placeholder="Full name"
                />
              </FormRow>
              <FormRow label="Email" htmlFor={`board_email_${index}`}>
                <Input
                  id={`board_email_${index}`}
                  type="email"
                  value={member.email}
                  onChange={(e) => updateBoardMember(index, "email", e.target.value)}
                  placeholder="email@example.com"
                />
              </FormRow>
              <FormRow label="Phone" htmlFor={`board_phone_${index}`}>
                <Input
                  id={`board_phone_${index}`}
                  type="tel"
                  value={member.phone}
                  onChange={(e) => updateBoardMember(index, "phone", e.target.value)}
                  placeholder="(555) 000-0000"
                />
              </FormRow>
              <FormRow label="Relationship to Founder" htmlFor={`board_rel_${index}`}>
                <Input
                  id={`board_rel_${index}`}
                  value={member.relationship}
                  onChange={(e) => updateBoardMember(index, "relationship", e.target.value)}
                  placeholder="e.g. Friend, Colleague, Professional"
                />
              </FormRow>
            </div>
          </div>
        ))}
        {form.np_board_members.length < 5 && (
          <Button
            type="button"
            variant="outline"
            onClick={addBoardMember}
            className="gap-2 text-teal-600 border-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20"
          >
            <Plus className="w-4 h-4" />
            Add another board member
          </Button>
        )}
      </div>
      <NavFooter
        onBack={goBack}
        onNext={goNext}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onNextDisabled={!boardValid}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Officers
// ---------------------------------------------------------------------------

function StepOfficers({ form, setField, goNext, goBack, canGoBack, canGoForward }: StepContentProps) {
  return (
    <div className="space-y-6">
      <StepHeader
        title="Officers"
        subtitle="These are the individuals who will hold leadership positions."
      />
      <div className="space-y-4">
        <FormRow label="President / Executive Director" htmlFor="np_president" required>
          <Input
            id="np_president"
            value={form.np_president}
            onChange={(e) => setField("np_president", e.target.value)}
            placeholder="Full name"
          />
        </FormRow>
        <FormRow label="Secretary" htmlFor="np_secretary" required>
          <Input
            id="np_secretary"
            value={form.np_secretary}
            onChange={(e) => setField("np_secretary", e.target.value)}
            placeholder="Full name"
          />
        </FormRow>
        <FormRow label="Treasurer" htmlFor="np_treasurer" required>
          <Input
            id="np_treasurer"
            value={form.np_treasurer}
            onChange={(e) => setField("np_treasurer", e.target.value)}
            placeholder="Full name"
          />
        </FormRow>
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          The President and Treasurer should be different individuals.
        </p>
      </div>
      <NavFooter
        onBack={goBack}
        onNext={goNext}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onNextDisabled={!form.np_president || !form.np_secretary || !form.np_treasurer}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Financial Projections
// ---------------------------------------------------------------------------

function StepFinancials({ form, setField, toggleMulti, goNext, goBack, canGoBack, canGoForward }: StepContentProps) {
  return (
    <div className="space-y-6">
      <StepHeader
        title="Financial Projections"
        subtitle="Your best estimates for Year 1 help us prepare your IRS application."
      />
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Expected Year 1 Revenue" htmlFor="np_year1_revenue">
            <Input
              id="np_year1_revenue"
              value={form.np_year1_revenue}
              onChange={(e) => setField("np_year1_revenue", e.target.value)}
              placeholder="e.g. $50,000"
            />
          </FormRow>
          <FormRow label="Expected Year 1 Expenses" htmlFor="np_year1_expenses">
            <Input
              id="np_year1_expenses"
              value={form.np_year1_expenses}
              onChange={(e) => setField("np_year1_expenses", e.target.value)}
              placeholder="e.g. $45,000"
            />
          </FormRow>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Primary Revenue Sources</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {REVENUE_OPTIONS.map((opt) => {
              const selected = form.np_revenue_sources.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleMulti("np_revenue_sources", opt.value)}
                  className={[
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left",
                    selected
                      ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300"
                      : "border-border hover:border-teal-300 text-foreground",
                  ].join(" ")}
                >
                  {selected ? (
                    <CheckSquare className="w-4 h-4 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 shrink-0 text-muted-foreground" />
                  )}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <FormRow label="Do you plan to compensate any officers?" htmlFor="np_compensate">
          <div className="flex gap-3">
            {["Yes", "No"].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setField("np_compensate_officers", val.toLowerCase())}
                className={[
                  "px-6 py-2 rounded-lg border text-sm font-medium transition-colors",
                  form.np_compensate_officers === val.toLowerCase()
                    ? "bg-teal-600 border-teal-600 text-white"
                    : "border-border text-foreground hover:border-teal-400",
                ].join(" ")}
              >
                {val}
              </button>
            ))}
          </div>
        </FormRow>
      </div>
      <NavFooter
        onBack={goBack}
        onNext={goNext}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Programs & Services
// ---------------------------------------------------------------------------

function StepPrograms({ form, setField, goNext, goBack, canGoBack, canGoForward }: StepContentProps) {
  return (
    <div className="space-y-6">
      <StepHeader
        title="Programs & Services"
        subtitle="Describe the programs and services your organization will provide."
      />
      <div className="space-y-3">
        <ul className="text-sm text-muted-foreground space-y-1 bg-muted/30 rounded-lg px-4 py-3">
          <li>• Who you will serve</li>
          <li>• What services / programs you will offer</li>
          <li>• Where you will operate (geographic area)</li>
          <li>• How often programs will run</li>
        </ul>
        <Textarea
          value={form.np_programs_description}
          onChange={(e) => setField("np_programs_description", e.target.value)}
          placeholder="We will provide free weekly tutoring sessions to elementary school students in Atlanta's Westside neighborhoods, operating Monday–Thursday afternoons from September through May…"
          rows={8}
        />
      </div>
      <NavFooter
        onBack={goBack}
        onNext={goNext}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onNextDisabled={!form.np_programs_description}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Populations Served
// ---------------------------------------------------------------------------

function StepPopulations({ form, toggleMulti, goNext, goBack, canGoBack, canGoForward }: StepContentProps) {
  return (
    <div className="space-y-6">
      <StepHeader
        title="Populations Served"
        subtitle="Select all populations your organization will primarily serve."
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {POPULATION_OPTIONS.map((opt) => {
          const selected = form.np_populations.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleMulti("np_populations", opt.value)}
              className={[
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left",
                selected
                  ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300"
                  : "border-border hover:border-teal-300 text-foreground",
              ].join(" ")}
            >
              {selected ? (
                <CheckSquare className="w-4 h-4 shrink-0" />
              ) : (
                <Square className="w-4 h-4 shrink-0 text-muted-foreground" />
              )}
              {opt.label}
            </button>
          );
        })}
      </div>
      <NavFooter
        onBack={goBack}
        onNext={goNext}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onNextDisabled={form.np_populations.length === 0}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Existing Documents
// ---------------------------------------------------------------------------

function StepExistingDocs({ form, toggleMulti, goNext, goBack, canGoBack, canGoForward }: StepContentProps) {
  return (
    <div className="space-y-6">
      <StepHeader
        title="What Do You Already Have?"
        subtitle="Check everything that already exists for your organization."
      />
      <div className="space-y-2">
        {EXISTING_DOC_OPTIONS.map((opt) => {
          const selected = form.np_existing_docs.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleMulti("np_existing_docs", opt.value)}
              className={[
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-colors text-left",
                selected
                  ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300"
                  : "border-border hover:border-teal-300 text-foreground bg-background",
              ].join(" ")}
            >
              {selected ? (
                <CheckSquare className="w-4 h-4 shrink-0" />
              ) : (
                <Square className="w-4 h-4 shrink-0 text-muted-foreground" />
              )}
              {opt.label}
            </button>
          );
        })}
      </div>
      <NavFooter
        onBack={goBack}
        onNext={goNext}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onNextDisabled={form.np_existing_docs.length === 0}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Document Upload
// ---------------------------------------------------------------------------

function StepDocUpload({
  form,
  dragActive,
  setDragActive,
  handleFileDrop,
  handleFileInput,
  removeFile,
  fileError,
  goNext,
  goBack,
  canGoBack,
  canGoForward,
}: StepContentProps) {
  return (
    <div className="space-y-6">
      <StepHeader
        title="Document Upload"
        subtitle="Upload any existing documents you already have. You can skip this step."
      />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleFileDrop}
        className={[
          "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
          dragActive
            ? "border-teal-400 bg-teal-50 dark:bg-teal-900/20"
            : "border-border hover:border-teal-300 bg-muted/20",
        ].join(" ")}
      >
        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">
          Drag & drop files here
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Articles, bylaws, EIN letter, conflict of interest policy, etc.
        </p>
        <label className="cursor-pointer">
          <span className="text-sm text-teal-600 font-medium hover:underline">
            Browse files
          </span>
          <input
            type="file"
            multiple
            onChange={handleFileInput}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
          />
        </label>
      </div>
      {fileError && <p className="text-xs text-destructive">{fileError}</p>}
      {form.np_uploaded_files.length > 0 && (
        <ul className="space-y-2">
          {form.np_uploaded_files.map((name, index) => (
            <li key={index} className="flex items-center justify-between gap-2 text-sm bg-muted/30 rounded-lg px-3 py-2">
              <span className="truncate text-foreground">{name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <NavFooter
        onBack={goBack}
        onNext={goNext}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        nextLabel={form.np_uploaded_files.length === 0 ? "Skip" : "Continue"}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Package Selection
// ---------------------------------------------------------------------------

function StepPackage({ form, setField, goNext, goBack, canGoBack, canGoForward }: StepContentProps) {
  return (
    <div className="space-y-6">
      <StepHeader
        title="Choose Your Package"
        subtitle="Select the level of service that fits your needs."
      />
      <div className="space-y-4">
        {PACKAGES.map((pkg) => {
          const selected = form.np_package === pkg.value;
          return (
            <button
              key={pkg.value}
              type="button"
              onClick={() => setField("np_package", pkg.value)}
              className={[
                "w-full text-left rounded-xl border-2 p-5 transition-all",
                selected
                  ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                  : "border-border hover:border-teal-300 bg-background",
                pkg.highlight && !selected ? "border-teal-200 dark:border-teal-800" : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-foreground">{pkg.label}</p>
                    {pkg.highlight && (
                      <span className="text-xs bg-teal-600 text-white px-2 py-0.5 rounded-full font-medium">
                        Most Popular
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xl font-bold text-teal-600 shrink-0">{pkg.priceDisplay}</p>
              </div>
              <ul className="space-y-1.5">
                {pkg.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      <NavFooter
        onBack={goBack}
        onNext={goNext}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onNextDisabled={!form.np_package}
        nextLabel="Review Application"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Review & Submit
// ---------------------------------------------------------------------------

function StepReview({ form, goBack, canGoBack, onSubmit, submitting }: StepContentProps) {
  const selectedPackage = PACKAGES.find((p) => p.value === form.np_package);
  const missionLabel = MISSION_OPTIONS.find((o) => o.value === form.np_primary_purpose)?.label;
  const populationLabels = POPULATION_OPTIONS.filter((o) =>
    form.np_populations.includes(o.value)
  ).map((o) => o.label);
  const revenueSrcLabels = REVENUE_OPTIONS.filter((o) =>
    form.np_revenue_sources.includes(o.value)
  ).map((o) => o.label);
  const existingDocLabels = EXISTING_DOC_OPTIONS.filter((o) =>
    form.np_existing_docs.includes(o.value)
  ).map((o) => o.label);

  return (
    <div className="space-y-6">
      <StepHeader
        title="Review & Submit"
        subtitle="Review your information before we send it to our formation team."
      />

      <div className="space-y-4">
        {/* Contact */}
        <ReviewSection title="Contact Information">
          <ReviewRow label="Name" value={form.np_full_name} />
          <ReviewRow label="Email" value={form.np_email} />
          <ReviewRow label="Phone" value={form.np_phone} />
          <ReviewRow label="Preferred Contact" value={form.np_contact_method} />
        </ReviewSection>

        {/* Mission */}
        <ReviewSection title="Mission & Purpose">
          <ReviewRow label="Mission" value={form.np_mission_statement} />
          <ReviewRow label="Primary Purpose" value={missionLabel} />
        </ReviewSection>

        {/* Org Details */}
        <ReviewSection title="Organization Details">
          <ReviewRow label="Name" value={form.np_org_name} />
          <ReviewRow label="State" value={form.np_state} />
          <ReviewRow label="City" value={form.np_city} />
          <ReviewRow label="Launch Date" value={form.np_launch_date} />
          <ReviewRow label="Fiscal Year" value={form.np_fiscal_year} />
        </ReviewSection>

        {/* Board */}
        <ReviewSection title="Board of Directors">
          {form.np_board_members.map((m, i) => (
            m.name && <ReviewRow key={i} label={`Member ${i + 1}`} value={m.name} />
          ))}
        </ReviewSection>

        {/* Officers */}
        <ReviewSection title="Officers">
          <ReviewRow label="President" value={form.np_president} />
          <ReviewRow label="Secretary" value={form.np_secretary} />
          <ReviewRow label="Treasurer" value={form.np_treasurer} />
        </ReviewSection>

        {/* Financials */}
        <ReviewSection title="Financials">
          <ReviewRow label="Year 1 Revenue" value={form.np_year1_revenue} />
          <ReviewRow label="Year 1 Expenses" value={form.np_year1_expenses} />
          <ReviewRow label="Revenue Sources" value={revenueSrcLabels.join(", ")} />
          <ReviewRow label="Compensate Officers" value={form.np_compensate_officers} />
        </ReviewSection>

        {/* Programs */}
        <ReviewSection title="Programs & Populations">
          <ReviewRow label="Programs" value={form.np_programs_description} />
          <ReviewRow label="Populations" value={populationLabels.join(", ")} />
        </ReviewSection>

        {/* Existing docs */}
        <ReviewSection title="Current Status">
          <ReviewRow label="Already have" value={existingDocLabels.join(", ")} />
          {form.np_uploaded_files.length > 0 && (
            <ReviewRow
              label="Uploaded files"
              value={`${form.np_uploaded_files.length} file(s)`}
            />
          )}
        </ReviewSection>

        {/* Package */}
        {selectedPackage && (
          <div className="rounded-xl border-2 border-teal-500 bg-teal-50 dark:bg-teal-900/20 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">
                  Selected Package
                </p>
                <p className="text-lg font-bold text-foreground">{selectedPackage.label}</p>
              </div>
              <p className="text-2xl font-bold text-teal-600">{selectedPackage.priceDisplay}</p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-muted/30 border border-border px-4 py-3 text-sm text-muted-foreground">
        By submitting, you agree to be contacted by our formation team within 24 hours. No payment
        is collected at this stage — a service agreement will be sent separately.
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="outline" onClick={goBack} disabled={!canGoBack} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={onSubmit}
          disabled={submitting}
          className="gap-2 bg-teal-600 hover:bg-teal-700 text-white px-8"
        >
          {submitting ? "Submitting…" : "Submit Application"}
          {!submitting && <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-1 pb-2">
      <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function FormRow({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-muted-foreground shrink-0 w-36">{label}</span>
      <span className="text-foreground font-medium break-words min-w-0">{value}</span>
    </div>
  );
}
