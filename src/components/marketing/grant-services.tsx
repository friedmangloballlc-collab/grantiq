import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const SERVICES = [
  {
    title: "Grant Eligibility Status",
    description:
      "Find out if your organization qualifies for grants in under a minute. Our AI analyzes your profile against federal, state, foundation, and corporate grant requirements and tells you exactly where you stand.",
    highlights: [
      "Clear eligibility verdict: Eligible, Conditional, or Not Yet",
      "Which grant categories you qualify for today",
      "Top blockers preventing eligibility with step-by-step fixes",
      "Quick wins you can act on this week (under $500)",
      "Estimated total grant dollars you could pursue",
      "Demographic certification eligibility (MBE, WOSB, HUBZone, 8(a))",
    ],
    cta: "Check Your Eligibility",
    href: "/signup?service=eligibility",
    color: "emerald",
  },
  {
    title: "Grant Eligibility & Readiness Diagnostic",
    description:
      "The most comprehensive grant readiness assessment available. Designed specifically for first-time grant seekers, this 10-step diagnostic tells you honestly where you stand, what it takes to become grant-ready, and exactly how to get there.",
    highlights: [
      "5-layer readiness audit: legal, financial, federal, nonprofit/for-profit, programmatic",
      "Risk & red flag screen for silent deal-killers",
      "COSO internal controls assessment (what funders actually test)",
      "Audit & site-visit simulation (could you survive a funder visit today?)",
      "4 scored dimensions: Readiness, Competitive, Controls, Audit (0-100)",
      "First-timer reality check: honest win rates, timelines, and expectations",
      "Top funder matches ranked for first-time applicants",
      "Sequenced remediation roadmap with costs, timelines, and dependencies",
    ],
    cta: "Get Your Diagnostic",
    href: "/signup?service=diagnostic",
    color: "blue",
  },
];

export function GrantServices() {
  return (
    <section id="services" className="py-20 px-4 bg-white dark:bg-warm-900 scroll-mt-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-brand-teal/10 text-brand-teal mb-4">
            One-Time Services
          </span>
          <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50">
            Know Where You Stand Before You Apply
          </h2>
          <p className="text-warm-500 mt-3 max-w-2xl mx-auto">
            Stop wasting time on grants you don&apos;t qualify for. Our AI-powered assessments
            give you expert-level analysis of your grant readiness in minutes, not weeks.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {SERVICES.map((service) => (
            <div
              key={service.title}
              className="rounded-2xl border border-warm-200 dark:border-warm-700 p-8 hover:border-brand-teal/50 transition-colors flex flex-col"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
                  service.color === "emerald"
                    ? "bg-emerald-100 dark:bg-emerald-900/30"
                    : "bg-blue-100 dark:bg-blue-900/30"
                }`}
              >
                {service.color === "emerald" ? (
                  <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                )}
              </div>

              <h3 className="text-xl font-bold text-warm-900 dark:text-warm-50 mb-2">
                {service.title}
              </h3>
              <p className="text-warm-500 text-sm leading-relaxed mb-4">
                {service.description}
              </p>

              <ul className="space-y-2 text-sm text-warm-600 dark:text-warm-400 mb-6 flex-1">
                {service.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {h}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white"
                render={
                  <Link href={service.href}>
                    {service.cta} <ArrowRight className="ml-2 h-4 w-4 inline" />
                  </Link>
                }
              />
            </div>
          ))}
        </div>

        {/* View all services link */}
        <div className="text-center mt-8">
          <Link
            href="/grant-services"
            className="text-sm text-brand-teal hover:text-brand-teal-dark font-medium inline-flex items-center gap-1"
          >
            View all grant services <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
