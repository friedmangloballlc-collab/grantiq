"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Target,
  CheckCircle,
  AlertCircle,
  Calendar,
  Flag,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Instrumentl-style 4-tab product walkthrough. Replaces the static
// ProductPreview component. Left: description + 3 bullets + Learn more.
// Right: a mockup tinted card using the same design primitives as the
// real product surfaces. When we swap for real screenshots later, just
// replace the <Mockup*> inner content with <Image>.

type TabKey = "find" | "write" | "manage" | "learn";

const TABS: {
  key: TabKey;
  num: string;
  label: string;
}[] = [
  { key: "find", num: "01", label: "Find" },
  { key: "write", num: "02", label: "Write" },
  { key: "manage", num: "03", label: "Manage" },
  { key: "learn", num: "04", label: "Learn" },
];

const CONTENT: Record<
  TabKey,
  {
    eyebrow: string;
    headline: string;
    lede: string;
    bullets: { label: string; body: string }[];
    href: string;
  }
> = {
  find: {
    eyebrow: "Step 1",
    headline: "Find funders that fit.",
    lede:
      "Not a keyword search — a match. GrantIQ analyzes funder profiles against your programs, priorities, and eligibility to surface the grants actually worth pursuing.",
    bullets: [
      {
        label: "AI-powered match",
        body: "Score 6,000+ active grants against your org — ranked 0-100, explained.",
      },
      {
        label: "Second-opinion critic",
        body: "A second AI pass kills false-positives on geography, size, and eligibility before you see them.",
      },
      {
        label: "Nightly verification",
        body: "Dead links and expired deadlines pulled automatically. Your library never rots.",
      },
    ],
    href: "/check",
  },
  write: {
    eyebrow: "Step 2",
    headline: "Write great proposals faster.",
    lede:
      "Every application starts halfway done — built on the funder research you've already gathered. AI drafts the narrative, and the auditor fact-checks every claim before you see it.",
    bullets: [
      {
        label: "AI drafting",
        body: "Full drafts in 30 minutes — narrative, budget, evaluation, all in your funder's language.",
      },
      {
        label: "Hallucination auditor",
        body: "Every claim source-verified against the RFP, your 990, and your org profile.",
      },
      {
        label: "Quality scorer",
        body: "0-100 score against the funder's rubric, with ranked improvements.",
      },
    ],
    href: "/ai-grant-writing",
  },
  manage: {
    eyebrow: "Step 3",
    headline: "Simplify post-award.",
    lede:
      "The moment a grant moves to awarded, we extract every compliance obligation from the RFP and drop it into your calendar. Reports, audits, site visits — nothing falls through.",
    bullets: [
      {
        label: "Auto-generated calendar",
        body: "Compliance events extracted from the award letter + RFP. Reminders included.",
      },
      {
        label: "Pipeline tracking",
        body: "Every stage from identified to awarded, with auto-generated checklists.",
      },
      {
        label: "Success-fee invoicing",
        body: "When you win, we handle the success-fee paperwork automatically.",
      },
    ],
    href: "/signup",
  },
  learn: {
    eyebrow: "Step 4",
    headline: "Win rate goes up over time.",
    lede:
      "When you mark a grant awarded or declined, GrantIQ extracts learnings from the application and the funder's feedback. Next time you write for the same funder, those lessons show up in your draft.",
    bullets: [
      {
        label: "Outcome learning",
        body: "Every win and loss feeds a per-funder learning store. Compounds month over month.",
      },
      {
        label: "Winning-language extraction",
        body: "The sentences that won get tagged and surfaced on your next draft for that funder.",
      },
      {
        label: "Pipeline analytics",
        body: "Win rate by funder, by program, by season — find the patterns in your own history.",
      },
    ],
    href: "/signup",
  },
};

// ─── Mockups ──────────────────────────────────────────────────────────────

function MockupFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-teal/15 via-warm-100 to-amber-100/40 dark:from-brand-teal/20 dark:via-warm-900 dark:to-amber-900/20 p-6 md:p-10">
      <div className="rounded-xl bg-white dark:bg-warm-900 shadow-sm p-5 border border-warm-200/50 dark:border-warm-800/50">
        {children}
      </div>
    </div>
  );
}

function FindMockup() {
  const matches = [
    { name: "Community Impact Fund", funder: "Blue Oak Foundation", score: 92, amount: "$50K" },
    { name: "Workforce Innovation Grant", funder: "State DWD", score: 87, amount: "$75K" },
    { name: "Equity in Action Award", funder: "Horizon Philanthropy", score: 84, amount: "$40K" },
    { name: "Rural Health Access Grant", funder: "HRSA", score: 78, amount: "$120K" },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-warm-100 dark:border-warm-800">
        <div>
          <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">
            Your top matches
          </p>
          <p className="text-xs text-warm-500">87 grants scored in 4 seconds</p>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal-text">
          Live
        </span>
      </div>
      <ul className="space-y-2">
        {matches.map((m) => (
          <li
            key={m.name}
            className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-warm-50 dark:hover:bg-warm-800/40"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`h-9 w-9 shrink-0 rounded-md flex items-center justify-center text-xs font-bold tabular-nums ${
                  m.score >= 85
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                }`}
              >
                {m.score}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-warm-900 dark:text-warm-50 truncate">
                  {m.name}
                </p>
                <p className="text-[10px] text-warm-500 truncate">{m.funder}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-warm-900 dark:text-warm-50 tabular-nums shrink-0">
              {m.amount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WriteMockup() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-warm-100 dark:border-warm-800">
        <div>
          <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">
            Project Description
          </p>
          <p className="text-xs text-warm-500">Section 3 of 6 · drafted</p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle className="h-3 w-3" aria-hidden="true" />
          Verified
        </span>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-2 rounded-full bg-warm-100 dark:bg-warm-800 w-full" />
        <div className="h-2 rounded-full bg-warm-100 dark:bg-warm-800 w-[92%]" />
        <div className="h-2 rounded-full bg-warm-100 dark:bg-warm-800 w-[88%]" />
        <div className="h-2 rounded-full bg-warm-100 dark:bg-warm-800 w-[95%]" />
        <div className="h-2 rounded-full bg-warm-100 dark:bg-warm-800 w-[70%]" />
      </div>
      <div className="p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 mb-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              1 claim needs support
            </p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5 leading-snug">
              &ldquo;We&apos;ve served over 1,200 youth&rdquo; — not in org
              profile
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-warm-100 dark:border-warm-800">
        <div className="flex items-center gap-1.5">
          <Target className="h-3 w-3 text-brand-teal" aria-hidden="true" />
          <span className="text-[11px] text-warm-600 dark:text-warm-400">
            Quality score
          </span>
        </div>
        <span className="text-sm font-bold text-brand-teal-text tabular-nums">
          71<span className="text-warm-500 font-normal text-xs">/85</span>
        </span>
      </div>
    </div>
  );
}

function ManageMockup() {
  const items = [
    { title: "Q1 Progress Report", date: "Sep 1", status: "on-track", icon: Calendar },
    { title: "Mid-Year Narrative", date: "Dec 15", status: "due-soon", icon: Calendar },
    { title: "Single Audit", date: "Mar 30", status: "on-track", icon: Flag },
    { title: "Final Report", date: "Aug 31", status: "on-track", icon: Flag },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-warm-100 dark:border-warm-800">
        <div>
          <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">
            Nourish Community Garden · Awarded
          </p>
          <p className="text-xs text-warm-500">$120K · HRSA · 12 obligations</p>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          On Track
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.title}
            className="flex items-center justify-between gap-3 p-2 rounded-lg bg-warm-50 dark:bg-warm-800/40"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 shrink-0 rounded-md bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-800 flex items-center justify-center">
                <item.icon
                  className="h-3.5 w-3.5 text-warm-600 dark:text-warm-400"
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-warm-900 dark:text-warm-50 truncate">
                  {item.title}
                </p>
                <p className="text-[10px] text-warm-500">Due {item.date}</p>
              </div>
            </div>
            <span
              className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0",
                item.status === "due-soon"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              )}
            >
              {item.status === "due-soon" ? "Due soon" : "Upcoming"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LearnMockup() {
  const learnings = [
    { label: "Winning language", body: "Naming specific beneficiary counts (1,200+) outperformed general claims by 23%." },
    { label: "Budget sweet spot", body: "HRSA awards from this office cluster in the $100-140K range." },
    { label: "Common weakness", body: "Evaluation plan scored lowest on last 3 losses — add methodology." },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-warm-100 dark:border-warm-800">
        <div>
          <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">
            HRSA · Funder learnings
          </p>
          <p className="text-xs text-warm-500">From 7 applications · 3 wins</p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal-text">
          <Trophy className="h-3 w-3" aria-hidden="true" />
          43% win rate
        </span>
      </div>
      <ul className="space-y-3">
        {learnings.map((l, i) => (
          <li
            key={i}
            className="p-3 rounded-lg bg-warm-50 dark:bg-warm-800/40 border border-warm-200/50 dark:border-warm-800"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-teal-text mb-1">
              {l.label}
            </p>
            <p className="text-xs text-warm-700 dark:text-warm-300 leading-relaxed">
              {l.body}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const MOCKUPS: Record<TabKey, () => React.ReactNode> = {
  find: FindMockup,
  write: WriteMockup,
  manage: ManageMockup,
  learn: LearnMockup,
};

// ─── Main ─────────────────────────────────────────────────────────────────

export function ProductWalkthrough() {
  const [active, setActive] = useState<TabKey>("find");
  const content = CONTENT[active];
  const Mockup = MOCKUPS[active];

  return (
    <section className="py-20 md:py-24 px-4 bg-warm-50 dark:bg-warm-900/30">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="mb-10 max-w-3xl">
          <p className="text-xs font-semibold text-brand-teal-text tracking-[0.2em] uppercase">
            The full cycle
          </p>
          <h2 className="mt-3 text-4xl md:text-5xl font-bold tracking-[-0.02em] text-warm-900 dark:text-warm-50 leading-[1.05]">
            One platform, four jobs.
          </h2>
          <p className="mt-4 text-warm-600 dark:text-warm-400 leading-relaxed">
            Most tools stop at one of these. GrantIQ handles the whole arc — from
            finding the right grant to learning from the outcome.
          </p>
        </div>

        {/* Tab row */}
        <div
          role="tablist"
          aria-label="Product walkthrough"
          className="flex flex-wrap items-center gap-2 mb-10 border-b border-warm-200 dark:border-warm-800"
        >
          {TABS.map((tab) => {
            const isActive = tab.key === active;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(tab.key)}
                className={cn(
                  "relative px-4 py-3 text-sm font-semibold inline-flex items-center gap-2 border-b-2 -mb-[1px] transition-colors",
                  isActive
                    ? "border-warm-900 dark:border-warm-50 text-warm-900 dark:text-warm-50"
                    : "border-transparent text-warm-500 hover:text-warm-900 dark:hover:text-warm-50"
                )}
              >
                <span
                  className={cn(
                    "text-[11px] tabular-nums font-mono",
                    isActive ? "text-brand-teal-text" : "text-warm-400"
                  )}
                >
                  {tab.num}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-center">
          <div>
            <p className="text-xs font-semibold text-brand-teal-text tracking-[0.15em] uppercase">
              {content.eyebrow}
            </p>
            <h3 className="mt-3 text-3xl md:text-4xl font-bold tracking-[-0.02em] text-warm-900 dark:text-warm-50 leading-[1.1]">
              {content.headline}
            </h3>
            <p className="mt-5 text-base text-warm-600 dark:text-warm-400 leading-relaxed">
              {content.lede}
            </p>
            <ul className="mt-7 space-y-4">
              {content.bullets.map((b) => (
                <li key={b.label} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-1 w-6 rounded-full bg-brand-teal shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">
                      {b.label}
                    </p>
                    <p className="text-sm text-warm-600 dark:text-warm-400 mt-0.5 leading-relaxed">
                      {b.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href={content.href}
              className="inline-flex items-center gap-1.5 mt-8 text-sm font-semibold text-warm-900 dark:text-warm-50 hover:text-brand-teal-text transition-colors group/link"
            >
              Learn more
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
            </Link>
          </div>

          <div>
            <MockupFrame>
              <Mockup />
            </MockupFrame>
          </div>
        </div>
      </div>
    </section>
  );
}
