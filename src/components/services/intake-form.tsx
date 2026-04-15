"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IntakeData {
  // Section 1 — Contact
  full_name: string;
  email: string;
  phone: string;
  role_title: string;
  company_name: string;
  website: string;
  // Section 2 — Entity Basics
  entity_type: string;
  state_of_formation: string;
  year_formed: string;
  industry: string;
  ein_obtained: string;
  good_standing: string;
  // Section 3 — Operations
  employee_count: string;
  annual_revenue: string;
  accounting_system: string;
  dedicated_bank_account: string;
  financial_statements_available: string;
  compliance_docs_held: string[];
  // Section 4 — Grant Goals
  target_grant_types: string[];
  target_dollar_range: string;
  timeline_to_first_app: string;
  applied_before: string;
  won_before: string;
  project_description: string;
  mission_statement: string;
  // Section 5 — Demographics
  owner_demographics: string[];
  in_hubzone_oz_rural: string;
  current_certifications: string[];
  // Section 6 — Federal Registrations
  uei_obtained: string;
  sam_registered: string;
  naics_identified: string;
  // Section 7 — Risk Screen
  federal_debt: string;
  government_litigation: string;
  bankruptcy_7yr: string;
  irs_issues: string;
  finances_comingled: string;
  nonprofit_status_active: string;
  // Section 8 — Insurance
  insurance_held: string[];
  // Section 9 — Other
  anything_else: string;
  referral_source: string;
}

const EMPTY_INTAKE: IntakeData = {
  full_name: "", email: "", phone: "", role_title: "", company_name: "", website: "",
  entity_type: "", state_of_formation: "", year_formed: "", industry: "", ein_obtained: "", good_standing: "",
  employee_count: "", annual_revenue: "", accounting_system: "", dedicated_bank_account: "", financial_statements_available: "", compliance_docs_held: [],
  target_grant_types: [], target_dollar_range: "", timeline_to_first_app: "", applied_before: "", won_before: "", project_description: "", mission_statement: "",
  owner_demographics: [], in_hubzone_oz_rural: "", current_certifications: [],
  uei_obtained: "", sam_registered: "", naics_identified: "",
  federal_debt: "", government_litigation: "", bankruptcy_7yr: "", irs_issues: "", finances_comingled: "", nonprofit_status_active: "",
  insurance_held: [],
  anything_else: "", referral_source: "",
};

// ---------------------------------------------------------------------------
// Reusable field components
// ---------------------------------------------------------------------------

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal resize-none"
    />
  );
}

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
    >
      <option value="">{placeholder ?? "Select..."}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function RadioGroup({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((o) => (
        <label key={o.value} className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-pointer transition-colors",
          value === o.value ? "border-brand-teal bg-brand-teal/5 text-foreground" : "border-border hover:border-muted-foreground"
        )}>
          <input type="radio" name={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
          <span className={cn("h-3.5 w-3.5 rounded-full border-2", value === o.value ? "border-brand-teal bg-brand-teal" : "border-muted-foreground")} />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function MultiSelect({ selected, onChange, options }: {
  selected: string[]; onChange: (v: string[]) => void; options: { value: string; label: string }[];
}) {
  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter((s) => s !== val) : [...selected, val]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => toggle(o.value)}
          className={cn(
            "px-3 py-1.5 rounded-full border text-sm transition-colors",
            selected.includes(o.value) ? "border-brand-teal bg-brand-teal/10 text-foreground" : "border-border text-muted-foreground hover:border-muted-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC","PR","VI",
].map((s) => ({ value: s, label: s }));

const ENTITY_TYPES = [
  { value: "llc", label: "LLC" },
  { value: "s_corp", label: "S-Corp" },
  { value: "c_corp", label: "C-Corp" },
  { value: "sole_prop", label: "Sole Proprietorship" },
  { value: "nonprofit_501c3", label: "501(c)(3) Nonprofit" },
  { value: "nonprofit_other", label: "Nonprofit (not 501c3)" },
  { value: "unincorporated", label: "Unincorporated" },
  { value: "other", label: "Other" },
];

const INDUSTRIES = [
  { value: "it_services", label: "IT / Technology Services" },
  { value: "computer_software", label: "Software / SaaS" },
  { value: "biotechnology", label: "Biotechnology" },
  { value: "hospital_healthcare", label: "Healthcare" },
  { value: "mental_health", label: "Mental Health" },
  { value: "higher_education", label: "Higher Education" },
  { value: "k12_education", label: "K-12 Education" },
  { value: "construction", label: "Construction" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "farming", label: "Agriculture / Farming" },
  { value: "food_beverages", label: "Food & Beverages" },
  { value: "restaurants", label: "Restaurants / Hospitality" },
  { value: "renewables", label: "Renewable Energy" },
  { value: "environmental_services", label: "Environmental Services" },
  { value: "performing_arts", label: "Arts & Culture" },
  { value: "civic_social", label: "Civic / Social Services" },
  { value: "family_services", label: "Family Services" },
  { value: "nonprofit_management", label: "Nonprofit Management" },
  { value: "financial_services", label: "Financial Services" },
  { value: "legal_services", label: "Legal Services" },
  { value: "real_estate", label: "Real Estate" },
  { value: "retail", label: "Retail" },
  { value: "transportation", label: "Transportation / Logistics" },
  { value: "defense_space", label: "Defense / Aerospace" },
  { value: "other", label: "Other" },
];

const COMPLIANCE_DOCS = [
  { value: "ein", label: "EIN" },
  { value: "501c3_letter", label: "501(c)(3) Determination Letter" },
  { value: "general_liability", label: "General Liability Insurance" },
  { value: "workers_comp", label: "Workers' Comp Insurance" },
  { value: "audited_financials", label: "Audited Financials" },
  { value: "uei", label: "UEI Number" },
  { value: "sam_registration", label: "SAM.gov Registration" },
  { value: "duns", label: "DUNS Number" },
];

const EMPLOYEE_COUNTS = [
  { value: "0", label: "0 (just me)" },
  { value: "1-5", label: "1–5" },
  { value: "6-25", label: "6–25" },
  { value: "26-100", label: "26–100" },
  { value: "100+", label: "100+" },
];

const REVENUE_RANGES = [
  { value: "pre_revenue", label: "Pre-revenue" },
  { value: "under_100k", label: "Under $100K" },
  { value: "100k_500k", label: "$100K–$500K" },
  { value: "500k_2m", label: "$500K–$2M" },
  { value: "2m_10m", label: "$2M–$10M" },
  { value: "10m_plus", label: "$10M+" },
];

const ACCOUNTING_SYSTEMS = [
  { value: "quickbooks", label: "QuickBooks" },
  { value: "xero", label: "Xero" },
  { value: "netsuite", label: "NetSuite" },
  { value: "spreadsheets", label: "Spreadsheets" },
  { value: "none", label: "None" },
  { value: "other", label: "Other" },
];

const GRANT_TYPES = [
  { value: "federal", label: "Federal" },
  { value: "state", label: "State" },
  { value: "local", label: "Local/Municipal" },
  { value: "foundation", label: "Foundation" },
  { value: "corporate", label: "Corporate" },
  { value: "sbir_sttr", label: "SBIR/STTR" },
  { value: "demographic", label: "Demographic-specific" },
];

const DOLLAR_RANGES = [
  { value: "1k_25k", label: "$1K–$25K" },
  { value: "25k_100k", label: "$25K–$100K" },
  { value: "100k_500k", label: "$100K–$500K" },
  { value: "500k_plus", label: "$500K+" },
];

const TIMELINES = [
  { value: "1_3_months", label: "1–3 months" },
  { value: "3_6_months", label: "3–6 months" },
  { value: "6_12_months", label: "6–12 months" },
  { value: "12_plus", label: "12+ months" },
];

const DEMOGRAPHICS = [
  { value: "woman_owned", label: "Women-owned" },
  { value: "minority_owned", label: "Minority-owned" },
  { value: "veteran_owned", label: "Veteran-owned" },
  { value: "sdvosb", label: "Service-disabled veteran-owned" },
  { value: "disability_owned", label: "Disability-owned" },
  { value: "none", label: "None apply" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const CERTIFICATIONS = [
  { value: "mbe", label: "MBE" },
  { value: "wosb", label: "WOSB" },
  { value: "vosb", label: "VOSB" },
  { value: "8a", label: "8(a)" },
  { value: "hubzone", label: "HUBZone" },
];

const INSURANCE_TYPES = [
  { value: "general_liability", label: "General Liability" },
  { value: "workers_comp", label: "Workers' Comp" },
  { value: "dno", label: "D&O" },
  { value: "professional_liability", label: "Professional Liability / E&O" },
  { value: "cyber", label: "Cyber Liability" },
  { value: "none", label: "None" },
];

const REFERRAL_SOURCES = [
  { value: "google", label: "Google Search" },
  { value: "social_media", label: "Social Media" },
  { value: "referral", label: "Referral / Word of Mouth" },
  { value: "blog", label: "Blog / Article" },
  { value: "ad", label: "Advertisement" },
  { value: "other", label: "Other" },
];

const YES_NO_UNSURE = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Unsure" },
];

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const YES_NO_NA = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "na", label: "Not applicable" },
];

const YES_PARTIAL_NO = [
  { value: "yes", label: "Yes" },
  { value: "partial", label: "Partial" },
  { value: "no", label: "No" },
];

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

const SECTIONS = [
  { key: "contact", title: "Contact Information", number: 1 },
  { key: "entity", title: "Entity Basics", number: 2 },
  { key: "operations", title: "Operations", number: 3 },
  { key: "goals", title: "Grant Goals", number: 4 },
  { key: "demographics", title: "Demographics & Designations", number: 5 },
  { key: "federal", title: "Federal Registrations", number: 6 },
  { key: "risk", title: "Risk Screen", number: 7 },
  { key: "insurance", title: "Insurance", number: 8 },
  { key: "other", title: "Anything Else", number: 9 },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface IntakeFormProps {
  serviceType: "eligibility_status" | "readiness_diagnostic";
  prefill?: Partial<IntakeData>;
  onComplete: (data: IntakeData) => void;
  submitting?: boolean;
}

export function IntakeForm({ serviceType, prefill, onComplete, submitting }: IntakeFormProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<IntakeData>({ ...EMPTY_INTAKE, ...prefill });

  const set = <K extends keyof IntakeData>(key: K, value: IntakeData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const section = SECTIONS[step];
  const isLast = step === SECTIONS.length - 1;

  const canProceed = (): boolean => {
    switch (section.key) {
      case "contact": return !!(data.full_name && data.email && data.company_name);
      case "entity": return !!(data.entity_type && data.state_of_formation);
      case "operations": return !!(data.employee_count && data.annual_revenue);
      case "goals": return !!(data.target_grant_types.length > 0);
      default: return true;
    }
  };

  const handleNext = () => {
    if (isLast) {
      onComplete(data);
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            Step {step + 1} of {SECTIONS.length}
          </span>
          <span className="text-xs font-medium text-foreground">{section.title}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-brand-teal transition-all duration-300"
            style={{ width: `${((step + 1) / SECTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {SECTIONS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => i <= step && setStep(i)}
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-full text-xs font-medium shrink-0 transition-colors",
              i < step ? "bg-brand-teal text-white" :
              i === step ? "bg-brand-teal/20 text-brand-teal border-2 border-brand-teal" :
              "bg-muted text-muted-foreground"
            )}
          >
            {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.number}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="py-6 space-y-5">
          {/* Section 1 — Contact */}
          {section.key === "contact" && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full Name" required>
                  <TextInput value={data.full_name} onChange={(v) => set("full_name", v)} placeholder="Jane Smith" />
                </Field>
                <Field label="Best Email" required>
                  <TextInput value={data.email} onChange={(v) => set("email", v)} placeholder="jane@company.com" type="email" />
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Phone">
                  <TextInput value={data.phone} onChange={(v) => set("phone", v)} placeholder="(555) 123-4567" type="tel" />
                </Field>
                <Field label="Role / Title">
                  <TextInput value={data.role_title} onChange={(v) => set("role_title", v)} placeholder="CEO, Founder, Executive Director" />
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Company / Organization Name" required>
                  <TextInput value={data.company_name} onChange={(v) => set("company_name", v)} placeholder="Acme Corp" />
                </Field>
                <Field label="Website">
                  <TextInput value={data.website} onChange={(v) => set("website", v)} placeholder="https://..." />
                </Field>
              </div>
            </>
          )}

          {/* Section 2 — Entity Basics */}
          {section.key === "entity" && (
            <>
              <Field label="Entity Type" required>
                <Select value={data.entity_type} onChange={(v) => set("entity_type", v)} options={ENTITY_TYPES} placeholder="Select entity type..." />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="State of Formation" required>
                  <Select value={data.state_of_formation} onChange={(v) => set("state_of_formation", v)} options={US_STATES} placeholder="Select state..." />
                </Field>
                <Field label="Year Formed">
                  <TextInput value={data.year_formed} onChange={(v) => set("year_formed", v)} placeholder="2020" />
                </Field>
              </div>
              <Field label="Industry / Sector">
                <Select value={data.industry} onChange={(v) => set("industry", v)} options={INDUSTRIES} placeholder="Select industry..." />
              </Field>
              <Field label="EIN Obtained?">
                <RadioGroup value={data.ein_obtained} onChange={(v) => set("ein_obtained", v)} options={YES_NO_UNSURE} />
              </Field>
              <Field label="Currently in Good Standing?">
                <RadioGroup value={data.good_standing} onChange={(v) => set("good_standing", v)} options={YES_NO_UNSURE} />
              </Field>
            </>
          )}

          {/* Section 3 — Operations */}
          {section.key === "operations" && (
            <>
              <Field label="Number of Employees" required>
                <RadioGroup value={data.employee_count} onChange={(v) => set("employee_count", v)} options={EMPLOYEE_COUNTS} />
              </Field>
              <Field label="Annual Revenue Range" required>
                <RadioGroup value={data.annual_revenue} onChange={(v) => set("annual_revenue", v)} options={REVENUE_RANGES} />
              </Field>
              <Field label="Accounting System">
                <RadioGroup value={data.accounting_system} onChange={(v) => set("accounting_system", v)} options={ACCOUNTING_SYSTEMS} />
              </Field>
              <Field label="Dedicated Business Bank Account?">
                <RadioGroup value={data.dedicated_bank_account} onChange={(v) => set("dedicated_bank_account", v)} options={YES_NO} />
              </Field>
              <Field label="Last 3 Years of Financial Statements Available?">
                <RadioGroup value={data.financial_statements_available} onChange={(v) => set("financial_statements_available", v)} options={YES_PARTIAL_NO} />
              </Field>
              <Field label="Which of These Do You Currently Have?">
                <MultiSelect selected={data.compliance_docs_held} onChange={(v) => set("compliance_docs_held", v)} options={COMPLIANCE_DOCS} />
              </Field>
            </>
          )}

          {/* Section 4 — Grant Goals */}
          {section.key === "goals" && (
            <>
              <Field label="Target Grant Types" required>
                <MultiSelect selected={data.target_grant_types} onChange={(v) => set("target_grant_types", v)} options={GRANT_TYPES} />
              </Field>
              <Field label="Target Dollar Range Per Grant">
                <RadioGroup value={data.target_dollar_range} onChange={(v) => set("target_dollar_range", v)} options={DOLLAR_RANGES} />
              </Field>
              <Field label="Timeline to First Application">
                <RadioGroup value={data.timeline_to_first_app} onChange={(v) => set("timeline_to_first_app", v)} options={TIMELINES} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Applied for a Grant Before?">
                  <RadioGroup value={data.applied_before} onChange={(v) => set("applied_before", v)} options={YES_NO} />
                </Field>
                <Field label="Ever Won a Grant?">
                  <RadioGroup value={data.won_before} onChange={(v) => set("won_before", v)} options={YES_NO} />
                </Field>
              </div>
              <Field label="What Project or Program Would the Grant Fund?">
                <TextArea value={data.project_description} onChange={(v) => set("project_description", v)} placeholder="Describe the project, program, or use of funds..." rows={4} />
              </Field>
              <Field label="Mission or Purpose of the Organization">
                <TextArea value={data.mission_statement} onChange={(v) => set("mission_statement", v)} placeholder="What is your organization's mission or core purpose?" rows={3} />
              </Field>
            </>
          )}

          {/* Section 5 — Demographics */}
          {section.key === "demographics" && (
            <>
              <Field label="Owner Demographics">
                <MultiSelect selected={data.owner_demographics} onChange={(v) => set("owner_demographics", v)} options={DEMOGRAPHICS} />
              </Field>
              <Field label="Located in HUBZone, Opportunity Zone, or Rural Area?">
                <RadioGroup value={data.in_hubzone_oz_rural} onChange={(v) => set("in_hubzone_oz_rural", v)} options={YES_NO_UNSURE} />
              </Field>
              <Field label="Currently Certified (select all that apply)">
                <MultiSelect selected={data.current_certifications} onChange={(v) => set("current_certifications", v)} options={CERTIFICATIONS} />
              </Field>
            </>
          )}

          {/* Section 6 — Federal Registrations */}
          {section.key === "federal" && (
            <>
              <Field label="UEI Number Obtained?">
                <RadioGroup value={data.uei_obtained} onChange={(v) => set("uei_obtained", v)} options={YES_NO_UNSURE} />
              </Field>
              <Field label="SAM.gov Registered and Active?">
                <RadioGroup value={data.sam_registered} onChange={(v) => set("sam_registered", v)} options={YES_NO_UNSURE} />
              </Field>
              <Field label="NAICS Codes Identified?">
                <RadioGroup value={data.naics_identified} onChange={(v) => set("naics_identified", v)} options={YES_NO_UNSURE} />
              </Field>
            </>
          )}

          {/* Section 7 — Risk Screen */}
          {section.key === "risk" && (
            <>
              <p className="text-sm text-muted-foreground mb-2">
                These questions help us identify potential blockers early. Your answers are confidential.
              </p>
              <Field label="Any outstanding federal debt or defaulted federal loans?">
                <RadioGroup value={data.federal_debt} onChange={(v) => set("federal_debt", v)} options={YES_NO} />
              </Field>
              <Field label="Any pending or past litigation with government entities?">
                <RadioGroup value={data.government_litigation} onChange={(v) => set("government_litigation", v)} options={YES_NO} />
              </Field>
              <Field label="Any bankruptcy in the last 7 years (entity or principals)?">
                <RadioGroup value={data.bankruptcy_7yr} onChange={(v) => set("bankruptcy_7yr", v)} options={YES_NO} />
              </Field>
              <Field label="Any unresolved IRS audits, liens, or levies?">
                <RadioGroup value={data.irs_issues} onChange={(v) => set("irs_issues", v)} options={YES_NO} />
              </Field>
              <Field label="Are personal and business finances combined (co-mingled)?">
                <RadioGroup value={data.finances_comingled} onChange={(v) => set("finances_comingled", v)} options={YES_NO} />
              </Field>
              <Field label="For Nonprofits: 501(c)(3) status active and 990s filed?">
                <RadioGroup value={data.nonprofit_status_active} onChange={(v) => set("nonprofit_status_active", v)} options={YES_NO_NA} />
              </Field>
            </>
          )}

          {/* Section 8 — Insurance */}
          {section.key === "insurance" && (
            <>
              <Field label="Current Insurance Held (select all that apply)">
                <MultiSelect selected={data.insurance_held} onChange={(v) => set("insurance_held", v)} options={INSURANCE_TYPES} />
              </Field>
            </>
          )}

          {/* Section 9 — Other */}
          {section.key === "other" && (
            <>
              <Field label="Anything Else We Should Know?">
                <TextArea value={data.anything_else} onChange={(v) => set("anything_else", v)} placeholder="Additional context, special circumstances, questions..." rows={4} />
              </Field>
              <Field label="How Did You Hear About Us?">
                <Select value={data.referral_source} onChange={(v) => set("referral_source", v)} options={REFERRAL_SOURCES} placeholder="Select..." />
              </Field>

              {/* Expectation setting */}
              <div className="rounded-lg bg-brand-teal/5 border border-brand-teal/20 p-4 mt-4">
                <p className="text-sm font-medium text-foreground">What Happens Next</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {serviceType === "eligibility_status"
                    ? "After you submit, our AI will analyze your information and deliver your Grant Eligibility Status report instantly."
                    : "After you submit, our AI will run a comprehensive 10-step analysis. You\u2019ll receive your full Grant Eligibility & Readiness Diagnostic within 48 hours."}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Button
          type="button"
          onClick={handleNext}
          disabled={!canProceed() || submitting}
          className="gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {serviceType === "eligibility_status" ? "Running Check..." : "Generating Diagnostic..."}
            </>
          ) : isLast ? (
            <>
              {serviceType === "eligibility_status" ? "Run Eligibility Check" : "Run Full Diagnostic"}
              <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
