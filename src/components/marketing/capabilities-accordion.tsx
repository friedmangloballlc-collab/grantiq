"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// Novatus-style accordion list: dense, scannable, editorial.
// Replaces "another grid of 4 feature cards" with something more grown-up.

type Tab = "find" | "write" | "manage";

const CAPABILITIES: Record<Tab, {
  label: string;
  items: {
    title: string;
    summary: string;
    body: string;
    href?: string;
  }[];
}> = {
  find: {
    label: "Find",
    items: [
      {
        title: "AI-powered grant matching",
        summary: "Score every open grant against your org in under 60 seconds.",
        body: "We analyze your mission, budget, program areas, state, and entity type against 6,000+ active federal, state, foundation, and corporate grants. You get a 0-100 fit score for each — ranked, filtered, and updated nightly as new grants come online.",
        href: "/check",
      },
      {
        title: "Second-opinion match critic",
        summary: "Kills false-positive matches before you see them.",
        body: "A second AI pass checks each match against hard requirements: geography, organization size, entity type, and NTEE focus. Matches that fail obvious eligibility tests are filtered out — you never waste time on grants you can't win.",
      },
      {
        title: "Nightly grant verification",
        summary: "Dead links and past deadlines pulled automatically.",
        body: "Every night, our verifier checks every grant in the library. URLs that 404, deadlines that silently passed, and funders that lost their IRS exempt status are flagged and archived. This is why our data doesn't rot like Candid's 2-year-stale library.",
      },
    ],
  },
  write: {
    label: "Write",
    items: [
      {
        title: "AI grant writing",
        summary: "Full applications drafted in 30 minutes, per-tier review.",
        body: "Upload the RFP. We generate every section — needs statement, project description, budget narrative, evaluation plan — in your funder's specific language. Tier 1 is pure AI, Tier 2 adds coherence and compliance review, Tier 3 adds a senior grant writer. Priced per draft, no subscription required.",
        href: "/ai-grant-writing",
      },
      {
        title: "Hallucination auditor",
        summary: "Every factual claim source-verified before you see it.",
        body: "Invented statistics, fabricated partnerships, and made-up outcomes are the #1 failure mode of AI grant writing. Our auditor extracts every factual claim from the draft and checks it against the RFP, your 990, and your org profile. Ungrounded claims are flagged — and blocking ones halt the pipeline until resolved.",
      },
      {
        title: "Quality scorer vs. the funder's rubric",
        summary: "0-100 score with ranked improvements before submission.",
        body: "We score the finished draft against the funder's actual scoring rubric (extracted from the RFP, or inferred from funder context). You see per-criterion breakdown, point gaps, and the top improvements ranked by point impact — so you know what's worth editing before submitting.",
      },
    ],
  },
  manage: {
    label: "Manage",
    items: [
      {
        title: "Pipeline and deadline tracking",
        summary: "Every grant, every stage, in one place.",
        body: "Kanban pipeline from identified → qualified → in-development → submitted → awarded or declined. Auto-generated application checklists, letter-of-intent tracking, and decision-timer reminders. Nothing falls through the cracks.",
      },
      {
        title: "Automatic compliance calendar",
        summary: "The moment you win, we build your obligations calendar.",
        body: "When a grant moves to 'awarded,' we extract every compliance obligation from the grant agreement and RFP — interim reports, audits, performance reviews, matching-funds documentation — and drop them into your compliance calendar with reminders. You focus on executing the grant, not tracking the paperwork.",
      },
      {
        title: "Outcome learning",
        summary: "Every win and loss teaches your next draft.",
        body: "When you mark a grant awarded or declined, we extract learnings from the submitted application and the funder's feedback. Next time you write for the same funder, our system uses what worked (and what didn't) to improve the draft. Your win rate compounds over time.",
      },
    ],
  },
};

const TABS: Tab[] = ["find", "write", "manage"];

export function CapabilitiesAccordion() {
  const [activeTab, setActiveTab] = useState<Tab>("find");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const activeSet = CAPABILITIES[activeTab];

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setOpenIndex(0); // reset to first item of new tab
  }

  return (
    <section className="py-20 md:py-24 px-4" id="capabilities">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <p className="text-xs font-semibold text-brand-teal-text tracking-[0.2em] uppercase">
            What GrantIQ does
          </p>
          <div className="mt-3 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.02em] text-warm-900 dark:text-warm-50 leading-[1.05]">
              Three jobs, in order:
            </h2>
            <p className="text-warm-600 dark:text-warm-400 max-w-md text-sm leading-relaxed">
              Most tools do one of these. We do all three, in the order you
              actually need them — find the grants, write the applications,
              manage the outcomes.
            </p>
          </div>
        </div>

        {/* Tab row */}
        <div
          role="tablist"
          aria-label="Capability category"
          className="inline-flex items-center gap-1 rounded-full border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-1 mb-8"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => handleTabChange(tab)}
              className={cn(
                "px-5 py-2 text-sm font-medium rounded-full transition-colors duration-150",
                activeTab === tab
                  ? "bg-warm-900 text-white dark:bg-warm-50 dark:text-warm-900"
                  : "text-warm-600 hover:text-warm-900 dark:text-warm-400 dark:hover:text-warm-50"
              )}
            >
              {CAPABILITIES[tab].label}
            </button>
          ))}
        </div>

        {/* Accordion list */}
        <div>
          {activeSet.items.map((item, i) => {
            const open = openIndex === i;
            return (
              <div
                key={`${activeTab}-${i}`}
                className={cn(
                  "border-b border-warm-200 dark:border-warm-800 transition-colors",
                  open && "border-warm-900/10 dark:border-warm-50/10"
                )}
              >
                <button
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="w-full py-6 flex items-start justify-between gap-6 text-left group/row"
                  aria-expanded={open}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-warm-900 dark:text-warm-50">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm md:text-base text-warm-600 dark:text-warm-400">
                      {item.summary}
                    </p>
                  </div>
                  <Plus
                    className={cn(
                      "h-5 w-5 text-warm-400 shrink-0 mt-1 transition-transform duration-200",
                      open && "rotate-45 text-brand-teal"
                    )}
                    aria-hidden="true"
                  />
                </button>
                {open && (
                  <div className="pb-6 pr-12 -mt-2">
                    <p className="text-sm md:text-base text-warm-700 dark:text-warm-300 leading-relaxed max-w-3xl">
                      {item.body}
                    </p>
                    {item.href && (
                      <Link
                        href={item.href}
                        className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-brand-teal-text hover:underline"
                      >
                        Learn more →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
