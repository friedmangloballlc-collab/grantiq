"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Target,
  Shield,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormData {
  // Page 1
  full_name: string;
  email: string;
  company_name: string;
  entity_type: string;
  state_of_formation: string;
  year_formed: string;
  industry: string;
  // Page 2
  annual_revenue: string;
  employee_count: string;
  dedicated_bank_account: string;
  accounting_system: string;
  sam_registered: string;
  compliance_docs: string[];
  // Page 3
  target_grant_types: string[];
  target_dollar_range: string;
  applied_before: string;
  won_before: string;
  owner_demographics: string[];
  red_flags: string[];
}

interface EligibilityReport {
  verdict: string;
  summary: string;
  readiness_score: number;
  eligible_categories: Array<{ category: string; status: string; reason: string; path_to_yes?: string }>;
  blockers: Array<{ issue: string; severity: string; fix: string; estimated_time: string; estimated_cost: string }>;
  quick_wins: Array<{ action: string; where: string; time: string; cost: string }>;
  estimated_addressable_universe: { low: number; high: number; program_count: number };
  demographic_eligibility: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Field components
// ---------------------------------------------------------------------------

let fieldCounter = 0;
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const id = `check-field-${++fieldCounter}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-warm-900 dark:text-warm-50">{label}</label>
      <div id={`${id}-wrapper`}>{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      aria-label={placeholder}
      className="w-full rounded-md border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal" />
  );
}

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal">
      <option value="">{placeholder ?? "Select..."}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Chip({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={cn(
      "px-3 py-1.5 rounded-full border text-sm transition-colors",
      selected ? "border-brand-teal bg-brand-teal/10 text-warm-900 dark:text-warm-50" : "border-warm-200 dark:border-warm-700 text-warm-500 hover:border-warm-400"
    )}>{label}</button>
  );
}

function RadioPill({ value, current, onChange, label }: { value: string; current: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-pointer transition-colors",
      current === value ? "border-brand-teal bg-brand-teal/5" : "border-warm-200 dark:border-warm-700 hover:border-warm-400"
    )}>
      <input type="radio" checked={current === value} onChange={() => onChange(value)} className="sr-only" />
      <span className={cn("h-3.5 w-3.5 rounded-full border-2", current === value ? "border-brand-teal bg-brand-teal" : "border-warm-400")} />
      {label}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENTITY_TYPES = [
  { value: "llc", label: "LLC" }, { value: "s_corp", label: "S-Corp" }, { value: "c_corp", label: "C-Corp" },
  { value: "sole_prop", label: "Sole Proprietorship" }, { value: "nonprofit_501c3", label: "501(c)(3) Nonprofit" },
  { value: "nonprofit_other", label: "Nonprofit (not 501c3)" }, { value: "unincorporated", label: "Not yet formed" },
  { value: "other", label: "Other" },
];

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"].map(s => ({ value: s, label: s }));

const INDUSTRIES = [
  { value: "it_services", label: "Technology / IT" }, { value: "hospital_healthcare", label: "Healthcare" },
  { value: "higher_education", label: "Education" }, { value: "construction", label: "Construction" },
  { value: "manufacturing", label: "Manufacturing" }, { value: "farming", label: "Agriculture" },
  { value: "food_beverages", label: "Food & Beverage" }, { value: "renewables", label: "Energy / Environment" },
  { value: "performing_arts", label: "Arts & Culture" }, { value: "civic_social", label: "Social Services" },
  { value: "financial_services", label: "Financial Services" }, { value: "retail", label: "Retail" },
  { value: "real_estate", label: "Real Estate" }, { value: "transportation", label: "Transportation" },
  { value: "other", label: "Other" },
];

const VERDICT_DISPLAY: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  eligible_now: { label: "You Are Grant-Eligible", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  conditionally_eligible: { label: "Conditionally Eligible", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  eligible_after_remediation: { label: "Eligible After a Few Fixes", icon: Clock, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  not_eligible: { label: "Not Eligible Yet — But Fixable", icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
};

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PublicCheckPage() {
  const [step, setStep] = useState(0); // 0-2 = form, 3 = results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<EligibilityReport | null>(null);
  const [utmSource] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("utm_source") ?? params.get("ref") ?? "";
  });
  const [form, setForm] = useState<FormData>({
    full_name: "", email: "", company_name: "", entity_type: "", state_of_formation: "", year_formed: "", industry: "",
    annual_revenue: "", employee_count: "", dedicated_bank_account: "", accounting_system: "", sam_registered: "", compliance_docs: [],
    target_grant_types: [], target_dollar_range: "", applied_before: "", won_before: "", owner_demographics: [], red_flags: [],
  });

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) => setForm((p) => ({ ...p, [key]: val }));
  const toggleArr = (key: "compliance_docs" | "target_grant_types" | "owner_demographics" | "red_flags", val: string) => {
    const arr = form[key];
    set(key, arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const canProceed = step === 0
    ? !!(form.email && form.company_name && form.entity_type)
    : step === 1
    ? !!(form.annual_revenue && form.employee_count)
    : true;

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/services/public-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, utm_source: utmSource }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setReport(data.report);
      setStep(3);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Results page
  if (step === 3 && report) {
    const v = VERDICT_DISPLAY[report.verdict] ?? VERDICT_DISPLAY.not_eligible;
    const VerdictIcon = v.icon;
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Verdict */}
        <div className={cn("rounded-2xl p-8 mb-8", v.bg)}>
          <div className="flex items-start gap-4">
            <VerdictIcon className={cn("h-10 w-10 shrink-0", v.color)} />
            <div>
              <h1 className={cn("text-2xl font-bold", v.color)}>{v.label}</h1>
              <p className="text-warm-700 dark:text-warm-300 mt-2">{report.summary}</p>
              <div className="flex items-center gap-6 mt-4">
                <div>
                  <span className="text-3xl font-bold text-warm-900 dark:text-warm-50">{report.readiness_score}</span>
                  <span className="text-sm text-warm-500">/100 Readiness</span>
                </div>
                {report.estimated_addressable_universe && (
                  <div>
                    <span className="text-lg font-bold text-warm-900 dark:text-warm-50">
                      {formatCurrency(report.estimated_addressable_universe.low)}–{formatCurrency(report.estimated_addressable_universe.high)}
                    </span>
                    <span className="text-sm text-warm-500"> grant universe</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Wins */}
        {report.quick_wins?.length > 0 && (
          <Card className="mb-6">
            <CardContent className="py-5">
              <h2 className="font-semibold text-base flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-amber-500" /> Quick Wins (Next 30 Days)
              </h2>
              <div className="space-y-3">
                {report.quick_wins.map((qw, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold shrink-0">{i + 1}</span>
                    <div>
                      <p className="font-medium">{qw.action}</p>
                      <p className="text-xs text-warm-500">{qw.where} &middot; {qw.time} &middot; {qw.cost}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Categories */}
        {report.eligible_categories?.length > 0 && (
          <Card className="mb-6">
            <CardContent className="py-5">
              <h2 className="font-semibold text-base flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-blue-500" /> Eligibility by Grant Type
              </h2>
              <div className="space-y-2">
                {report.eligible_categories.map((cat, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-warm-100 dark:border-warm-800 last:border-0">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                      cat.status === "eligible" ? "bg-emerald-100 text-emerald-700" :
                      cat.status === "conditional" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    )}>
                      {cat.status === "eligible" ? "Eligible" : cat.status === "conditional" ? "Conditional" : "Not Yet"}
                    </span>
                    <span className="flex-1 font-medium">{cat.category}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Blockers */}
        {report.blockers?.length > 0 && (
          <Card className="mb-6">
            <CardContent className="py-5">
              <h2 className="font-semibold text-base flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-red-500" /> Top Blockers to Fix
              </h2>
              {report.blockers.slice(0, 5).map((b, i) => (
                <div key={i} className="mb-3 last:mb-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{b.issue}</p>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full shrink-0",
                      b.severity === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    )}>{b.severity}</span>
                  </div>
                  <p className="text-xs text-warm-500 mt-0.5">{b.fix} &middot; {b.estimated_time} &middot; {b.estimated_cost}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* CTA — Get Full Diagnostic */}
        <div className="rounded-2xl border-2 border-brand-teal bg-brand-teal/5 p-8 text-center">
          <Zap className="h-8 w-8 text-brand-teal mx-auto mb-3" />
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50 mb-2">
            Want the Full Picture?
          </h2>
          <p className="text-sm text-warm-500 max-w-md mx-auto mb-6">
            This was a quick check. The full Grant Eligibility &amp; Readiness Diagnostic covers
            5 audit layers, COSO controls, site-visit simulation, funder matching, and a
            week-by-week remediation roadmap — with specific costs, URLs, and next steps for
            every gap.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-brand-teal hover:bg-brand-teal-dark text-white px-8"
              render={<Link href="/signup?service=diagnostic">Get Full Diagnostic — Free <ArrowRight className="ml-2 h-4 w-4 inline" /></Link>} />
            <Button size="lg" variant="outline"
              render={<Link href="/signup">Create Free Account</Link>} />
          </div>
        </div>
      </div>
    );
  }

  // Form pages
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50">
          Check Your Grant Eligibility — Free
        </h1>
        <p className="text-warm-500 mt-2">
          Answer a few questions and get an instant AI-powered eligibility assessment. No account needed.
        </p>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {["Your Organization", "Financial Snapshot", "Grant Goals"].map((label, i) => (
          <div key={i} className="flex-1">
            <div className={cn("h-1 rounded-full mb-1", i <= step ? "bg-brand-teal" : "bg-warm-200 dark:bg-warm-700")} />
            <p className={cn("text-xs", i === step ? "text-brand-teal font-medium" : "text-warm-400")}>{label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 p-4 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Card>
        <CardContent className="py-6 space-y-5">
          {/* Page 1 — Organization */}
          {step === 0 && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Your Name">
                  <TextInput value={form.full_name} onChange={(v) => set("full_name", v)} placeholder="Jane Smith" />
                </Field>
                <Field label="Email *">
                  <TextInput value={form.email} onChange={(v) => set("email", v)} placeholder="jane@company.com" type="email" />
                </Field>
              </div>
              <Field label="Company / Organization Name *">
                <TextInput value={form.company_name} onChange={(v) => set("company_name", v)} placeholder="Acme Corp" />
              </Field>
              <Field label="Entity Type *">
                <Select value={form.entity_type} onChange={(v) => set("entity_type", v)} options={ENTITY_TYPES} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="State">
                  <Select value={form.state_of_formation} onChange={(v) => set("state_of_formation", v)} options={US_STATES} />
                </Field>
                <Field label="Year Formed">
                  <TextInput value={form.year_formed} onChange={(v) => set("year_formed", v)} placeholder="2020" />
                </Field>
              </div>
              <Field label="Industry">
                <Select value={form.industry} onChange={(v) => set("industry", v)} options={INDUSTRIES} />
              </Field>
            </>
          )}

          {/* Page 2 — Financial */}
          {step === 1 && (
            <>
              <Field label="Annual Revenue *">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "pre_revenue", label: "Pre-revenue" }, { value: "under_100k", label: "Under $100K" },
                    { value: "100k_500k", label: "$100K–$500K" }, { value: "500k_2m", label: "$500K–$2M" },
                    { value: "2m_10m", label: "$2M–$10M" }, { value: "10m_plus", label: "$10M+" },
                  ].map((o) => <RadioPill key={o.value} value={o.value} current={form.annual_revenue} onChange={(v) => set("annual_revenue", v)} label={o.label} />)}
                </div>
              </Field>
              <Field label="Employees *">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "0", label: "Just me" }, { value: "1-5", label: "1–5" },
                    { value: "6-25", label: "6–25" }, { value: "26-100", label: "26–100" }, { value: "100+", label: "100+" },
                  ].map((o) => <RadioPill key={o.value} value={o.value} current={form.employee_count} onChange={(v) => set("employee_count", v)} label={o.label} />)}
                </div>
              </Field>
              <Field label="Dedicated Business Bank Account?">
                <div className="flex gap-2">
                  <RadioPill value="yes" current={form.dedicated_bank_account} onChange={(v) => set("dedicated_bank_account", v)} label="Yes" />
                  <RadioPill value="no" current={form.dedicated_bank_account} onChange={(v) => set("dedicated_bank_account", v)} label="No" />
                </div>
              </Field>
              <Field label="SAM.gov Registration">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "yes", label: "Registered" }, { value: "started", label: "Started" },
                    { value: "no", label: "Not yet" }, { value: "unsure", label: "What's this?" },
                  ].map((o) => <RadioPill key={o.value} value={o.value} current={form.sam_registered} onChange={(v) => set("sam_registered", v)} label={o.label} />)}
                </div>
              </Field>
              <Field label="Which of these do you have?">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "ein", label: "EIN" }, { value: "501c3_letter", label: "501(c)(3) Letter" },
                    { value: "general_liability", label: "General Liability Insurance" }, { value: "workers_comp", label: "Workers' Comp" },
                    { value: "audited_financials", label: "Audited Financials" }, { value: "uei", label: "UEI Number" },
                  ].map((o) => <Chip key={o.value} selected={form.compliance_docs.includes(o.value)} onClick={() => toggleArr("compliance_docs", o.value)} label={o.label} />)}
                </div>
              </Field>
            </>
          )}

          {/* Page 3 — Goals & Screen */}
          {step === 2 && (
            <>
              <Field label="What would you use grant funding for?">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "equipment", label: "Equipment" }, { value: "hiring", label: "Hiring" },
                    { value: "rd", label: "R&D" }, { value: "training", label: "Training" },
                    { value: "construction", label: "Construction" }, { value: "operations", label: "Operations" },
                    { value: "programs", label: "Programs/Services" }, { value: "other", label: "Other" },
                  ].map((o) => <Chip key={o.value} selected={form.target_grant_types.includes(o.value)} onClick={() => toggleArr("target_grant_types", o.value)} label={o.label} />)}
                </div>
              </Field>
              <Field label="Funding amount you're seeking">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "1k_25k", label: "$1K–$25K" }, { value: "25k_100k", label: "$25K–$100K" },
                    { value: "100k_500k", label: "$100K–$500K" }, { value: "500k_plus", label: "$500K+" },
                  ].map((o) => <RadioPill key={o.value} value={o.value} current={form.target_dollar_range} onChange={(v) => set("target_dollar_range", v)} label={o.label} />)}
                </div>
              </Field>
              <Field label="Grant experience">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "never", label: "Never applied" }, { value: "applied_not_won", label: "Applied but didn't win" },
                    { value: "won_under_50k", label: "Won under $50K" }, { value: "won_50k_plus", label: "Won $50K+" },
                  ].map((o) => <RadioPill key={o.value} value={o.value} current={form.applied_before} onChange={(v) => { set("applied_before", v); set("won_before", v.startsWith("won") ? "yes" : "no"); }} label={o.label} />)}
                </div>
              </Field>
              <Field label="Owner demographics (select all that apply)">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "woman_owned", label: "Woman-owned" }, { value: "minority_owned", label: "Minority-owned" },
                    { value: "veteran_owned", label: "Veteran-owned" }, { value: "disability_owned", label: "Disability-owned" },
                    { value: "none", label: "None / Prefer not to say" },
                  ].map((o) => <Chip key={o.value} selected={form.owner_demographics.includes(o.value)} onClick={() => toggleArr("owner_demographics", o.value)} label={o.label} />)}
                </div>
              </Field>
              <Field label="Red flag screen (check any that apply)">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "federal_debt", label: "Outstanding federal debt" },
                    { value: "litigation", label: "Government litigation" },
                    { value: "bankruptcy", label: "Bankruptcy (last 7 years)" },
                    { value: "irs_issues", label: "IRS audit/lien/levy" },
                    { value: "comingled", label: "Personal & business finances combined" },
                    { value: "none", label: "None of these" },
                  ].map((o) => <Chip key={o.value} selected={form.red_flags.includes(o.value)} onClick={() => toggleArr("red_flags", o.value)} label={o.label} />)}
                </div>
              </Field>
            </>
          )}
        </CardContent>
      </Card>

      {/* Nav */}
      <div className="flex items-center justify-between mt-6">
        <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < 2 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canProceed} className="gap-2">
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Checking Eligibility...</>
            ) : (
              <>Check My Eligibility <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        )}
      </div>

      <p className="text-xs text-warm-400 text-center mt-6">
        Your information is confidential and only used to generate your eligibility report.
      </p>
    </div>
  );
}
