import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Shield, FileSearch, Clock, BarChart3, Target, Users, Zap } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grant Services — Eligibility, Readiness, Writing & More | GrantAQ",
  description:
    "16 grant services: free eligibility check, readiness diagnostic, SAM registration, policy drafting, grant writing, 501(c)(3) formation, and more. AI-powered for first-time grant seekers.",
  alternates: { canonical: "https://grantaq.com/grant-services" },
};

const ELIGIBILITY_FEATURES = [
  "Clear eligibility verdict across all grant categories",
  "Federal, state, foundation, corporate, SBIR/STTR, and starter grants",
  "Specific blockers with severity, fix steps, time, and cost estimates",
  "3-5 quick wins you can do this month for under $500",
  "Estimated total grant dollars you could pursue annually",
  "Demographic & designation eligibility (MBE, WOSB, VOSB, HUBZone, 8(a))",
  "AI-generated in under 60 seconds",
];

const DIAGNOSTIC_FEATURES = [
  "5-layer readiness audit (legal, financial, federal, nonprofit/for-profit, programmatic)",
  "Risk & red flag screen for silent deal-killers first-timers miss",
  "COSO internal controls self-assessment (what funders actually test)",
  "Audit & site-visit readiness simulation (20+ document checks)",
  "4 scored dimensions: Readiness, Competitive, Controls, Audit (each 0-100)",
  "First-timer reality check with honest win rates and timelines",
  "Top 5-10 funder matches ranked for first-time applicants",
  "Eligibility breakdown across 10 grant categories",
  "Demographic & designation eligibility matrix",
  "Sequenced remediation roadmap (weeks 1-12+) with costs and dependencies",
  "Post-award compliance preview for your first grant",
  "Service tier recommendation based on your scores",
  "Full client-facing report in professional format",
];

const PROCESS_STEPS = [
  { step: 1, title: "Complete Your Profile", description: "Answer our onboarding questions about your organization, industry, and goals. Takes about 3 minutes." },
  { step: 2, title: "Choose Your Assessment", description: "Select the Eligibility Status for a quick check, or the full Readiness Diagnostic for comprehensive analysis." },
  { step: 3, title: "Get Your Report", description: "Our AI analyzes your profile against thousands of data points and delivers your personalized assessment instantly." },
  { step: 4, title: "Take Action", description: "Follow your quick wins, fix blockers, and use your remediation roadmap to become grant-ready." },
];

export default function ServicesMarketingPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-brand-teal/10 text-brand-teal mb-4">
            Grant Assessment Services
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-warm-900 dark:text-warm-50 leading-tight">
            Know Where You Stand<br />Before You Apply
          </h1>
          <p className="text-lg text-warm-500 mt-4 max-w-2xl mx-auto">
            Stop guessing. Our AI-powered assessments give you expert-level grant readiness
            analysis in minutes — the same methodology used by senior grant strategists with 15+ years of experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button
              size="lg"
              className="bg-brand-teal hover:bg-brand-teal-dark text-white px-8"
              render={<Link href="/signup?service=eligibility">Check Eligibility <ArrowRight className="ml-2 h-4 w-4 inline" /></Link>}
            />
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/signup?service=diagnostic">Get Full Diagnostic</Link>}
            />
          </div>
        </div>
      </section>

      {/* Service 1 — Eligibility Status */}
      <section id="eligibility-status" className="py-20 px-4 bg-emerald-50/50 dark:bg-emerald-950/10 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-5">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50 mb-3">
                Grant Eligibility Status
              </h2>
              <p className="text-warm-500 text-base leading-relaxed mb-6">
                A quick, AI-powered assessment that tells you whether your organization is
                eligible for grants right now. Get a clear verdict, see which grant categories
                you qualify for, and know exactly what to fix first.
              </p>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-warm-600">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span>Under 60 seconds</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-warm-600">
                  <Zap className="h-4 w-4 text-emerald-600" />
                  <span>AI-generated</span>
                </div>
              </div>
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                render={<Link href="/signup?service=eligibility">Check Your Eligibility <ArrowRight className="ml-2 h-4 w-4 inline" /></Link>}
              />
            </div>
            <div>
              <ul className="space-y-3">
                {ELIGIBILITY_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-warm-700 dark:text-warm-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Service 2 — Readiness Diagnostic */}
      <section id="readiness-diagnostic" className="py-20 px-4 bg-white dark:bg-warm-900 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-5">
                <FileSearch className="w-7 h-7 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50 mb-3">
                Grant Eligibility &amp; Readiness Diagnostic
              </h2>
              <p className="text-warm-500 text-base leading-relaxed mb-4">
                The most comprehensive grant readiness assessment available — designed specifically
                for first-time grant seekers. This 10-step diagnostic covers everything a senior
                grant strategist would evaluate, delivered by AI in minutes.
              </p>
              <p className="text-xs text-warm-400 italic mb-6">
                This is a Grant Readiness &amp; Eligibility Diagnostic. It is not a substitute for a
                licensed CPA-performed financial audit, Single Audit, or Form 990 preparation.
              </p>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-warm-600">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>~2 minutes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-warm-600">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span>4 scored dimensions</span>
                </div>
              </div>
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                render={<Link href="/signup?service=diagnostic">Get Your Diagnostic <ArrowRight className="ml-2 h-4 w-4 inline" /></Link>}
              />
            </div>
            <div>
              <ul className="space-y-3">
                {DIAGNOSTIC_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-warm-700 dark:text-warm-300">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* The 10 Steps */}
      <section className="py-20 px-4 bg-warm-50 dark:bg-warm-800/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50">
              What the Full Diagnostic Covers
            </h2>
            <p className="text-warm-500 mt-3">10 steps. Zero guesswork.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Shield, title: "Layered Readiness Audit", desc: "5 layers: universal, federal, nonprofit, for-profit, programmatic" },
              { icon: Target, title: "Risk & Red Flag Screen", desc: "Silent deal-killers that block 90% of first-time applicants" },
              { icon: BarChart3, title: "Internal Controls (COSO)", desc: "5-component assessment of your control environment" },
              { icon: FileSearch, title: "Audit & Site-Visit Simulation", desc: "20+ document checks — could you survive a funder visit?" },
              { icon: Zap, title: "Scored Dimensions", desc: "Readiness, Competitive, Controls, and Audit scores (0-100)" },
              { icon: Target, title: "Grant Universe Estimate", desc: "Total annual dollars you could pursue once ready" },
              { icon: Users, title: "First-Timer Funder Matches", desc: "Top 5-10 programs that welcome new applicants" },
              { icon: Shield, title: "Eligibility by Category", desc: "10 grant categories with verdict and rationale" },
              { icon: Clock, title: "Remediation Roadmap", desc: "Week-by-week plan from today to first application" },
              { icon: CheckCircle2, title: "Service Recommendation", desc: "Personalized next step tied to your scores" },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex gap-4 rounded-xl border border-warm-200 dark:border-warm-700 p-5 bg-white dark:bg-warm-900">
                  <div className="w-8 h-8 rounded-lg bg-brand-teal/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-brand-teal" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-warm-900 dark:text-warm-50">{step.title}</p>
                    <p className="text-xs text-warm-500 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-white dark:bg-warm-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50 text-center mb-12">
            How It Works
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
            {PROCESS_STEPS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-brand-teal text-white flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold text-warm-900 dark:text-warm-50 text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-warm-500">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-20 px-4 bg-brand-teal/5 dark:bg-brand-teal/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50 mb-4">
            Built for First-Time Grant Seekers
          </h2>
          <p className="text-warm-500 max-w-2xl mx-auto mb-8">
            Whether you&apos;re a brand-new LLC, an unincorporated nonprofit, a solo founder,
            or an established business exploring grants for the first time — we tell you
            honestly where you stand and exactly what to do next.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 text-left">
            {[
              { title: "Small Businesses", desc: "LLCs, S-Corps, C-Corps, sole proprietors exploring government and corporate grants" },
              { title: "New Nonprofits", desc: "Organizations forming or recently formed, navigating 501(c)(3) and foundation eligibility" },
              { title: "Established Orgs", desc: "Businesses and nonprofits ready to tap into grant funding for the first time" },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-warm-200 dark:border-warm-700 p-5 bg-white dark:bg-warm-900">
                <h3 className="font-semibold text-sm text-warm-900 dark:text-warm-50 mb-1">{item.title}</h3>
                <p className="text-xs text-warm-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All Services */}
      <section className="py-20 px-4 bg-white dark:bg-warm-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50">All Grant Services</h2>
            <p className="text-warm-500 mt-3">From eligibility check to application submission — everything in one platform.</p>
          </div>

          <h3 className="text-lg font-semibold text-warm-900 dark:text-warm-50 mb-4">Service Engagements</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {[
              { title: "Tier 1 — Readiness Review", price: "$997", desc: "Full diagnostic + 45-minute walkthrough call with grant strategist", time: "5-7 days" },
              { title: "Tier 2 — Remediation Roadmap", price: "$2,997", desc: "Step-by-step playbook, templates, vendor directory, 2 strategy calls, 30-day support", time: "2-3 weeks", popular: true },
              { title: "Tier 3 — Readiness Accelerator", price: "$7,497", desc: "Done-for-you: SAM/UEI, policies, logic model, first application drafted, weekly sessions", time: "60-120 days" },
              { title: "Strategic Restructuring", price: "$2,497", desc: "For orgs not currently eligible — structural analysis + alternative capital roadmap", time: "2-4 weeks" },
            ].map((s) => (
              <div key={s.title} className="rounded-xl border border-warm-200 dark:border-warm-700 p-6 relative">
                {s.popular && <span className="absolute -top-3 left-4 px-3 py-0.5 bg-brand-teal text-white text-xs font-semibold rounded-full">Most Popular</span>}
                <h4 className="font-bold text-warm-900 dark:text-warm-50">{s.title}</h4>
                <p className="text-brand-teal font-semibold text-lg mt-1">{s.price}</p>
                <p className="text-sm text-warm-500 mt-2">{s.desc}</p>
                <p className="text-xs text-warm-400 mt-2">{s.time}</p>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-warm-900 dark:text-warm-50 mb-4">Add-On Services</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {[
              { title: "Starter Grant Package", price: "$497", desc: "AI writes 3-5 first-timer-friendly grant applications" },
              { title: "501(c)(3) Formation", price: "$3,997", desc: "Guided nonprofit formation with AI-generated documents" },
              { title: "SAM.gov Registration", price: "$1,497", desc: "Done-for-you SAM.gov + UEI registration" },
              { title: "Policy Drafting Package", price: "$997", desc: "8 AI-customized grant compliance policies" },
              { title: "Application Review", price: "$497-$997", desc: "Expert AI review of your completed application" },
              { title: "Logic Model Builder", price: "$197", desc: "AI-built logic model, theory of change, SMART objectives" },
              { title: "Audit Preparation", price: "$497", desc: "Mock site-visit, document checklist, 30-day prep plan" },
              { title: "Grant-Ready Certification", price: "Included in T2/T3", desc: "Official badge + verification URL for your website" },
              { title: "Compliance Calendar", price: "Free", desc: "Auto-generated deadlines: SAM, 990, state filings, insurance" },
            ].map((s) => (
              <div key={s.title} className="rounded-lg border border-warm-200 dark:border-warm-700 p-4">
                <h4 className="font-semibold text-sm text-warm-900 dark:text-warm-50">{s.title}</h4>
                <p className="text-brand-teal font-semibold text-sm mt-0.5">{s.price}</p>
                <p className="text-xs text-warm-500 mt-1">{s.desc}</p>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-warm-900 dark:text-warm-50 mb-4">Grant Writing</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { title: "AI Only", price: "$497-$1,497", desc: "AI-generated draft with compliance check" },
              { title: "AI + Expert Audit", price: "$497-$1,497", desc: "AI draft + human expert review" },
              { title: "Expert-Led", price: "$997-$2,997", desc: "Professional writer + AI + 2 revisions" },
              { title: "Full Confidence", price: "$0 upfront", desc: "3-10% success fee — pay only if you win" },
            ].map((s) => (
              <div key={s.title} className="rounded-lg border border-warm-200 dark:border-warm-700 p-4">
                <h4 className="font-semibold text-sm text-warm-900 dark:text-warm-50">{s.title}</h4>
                <p className="text-brand-teal font-semibold text-sm mt-0.5">{s.price}</p>
                <p className="text-xs text-warm-500 mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 px-4 text-center">
        <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50">
          Stop Guessing. Start Knowing.
        </h2>
        <p className="text-warm-500 mt-2 max-w-xl mx-auto">
          Get your grant eligibility assessed by AI in minutes. Know exactly which grants
          you qualify for and what to fix first.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Button
            size="lg"
            className="bg-brand-teal hover:bg-brand-teal-dark text-white px-8"
            render={<Link href="/signup">Get Started Free <ArrowRight className="ml-2 h-4 w-4 inline" /></Link>}
          />
          <Button
            size="lg"
            variant="outline"
            render={<Link href="/pricing">View Pricing</Link>}
          />
        </div>
      </section>
    </>
  );
}
