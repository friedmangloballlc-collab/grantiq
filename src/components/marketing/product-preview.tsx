// Product preview section — inline SVG/HTML mockups of real GrantIQ
// surfaces. This is Novatus's "here's the dashboard" move, done without
// requiring us to ship real photo-quality screenshots.
//
// When we have 3+ real customers, swap these for actual screenshots.

import Link from "next/link";
import { ArrowUpRight, CheckCircle, AlertCircle, Target } from "lucide-react";

function MatchesMockup() {
  const matches = [
    { name: "Community Impact Fund", funder: "Blue Oak Foundation", score: 92, amount: "$50K" },
    { name: "Workforce Innovation Grant", funder: "State DWD", score: 87, amount: "$75K" },
    { name: "Equity in Action Award", funder: "Horizon Philanthropy", score: 84, amount: "$40K" },
    { name: "Rural Health Access Grant", funder: "HRSA", score: 78, amount: "$120K" },
  ];
  return (
    <div className="rounded-xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-warm-100 dark:border-warm-800">
        <div>
          <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">
            Top Matches
          </p>
          <p className="text-xs text-warm-500">87 grants scored for your org</p>
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
                className={`h-8 w-8 shrink-0 rounded-md flex items-center justify-center text-xs font-bold tabular-nums ${
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

function DraftMockup() {
  return (
    <div className="rounded-xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-4 shadow-sm">
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
      <div className="space-y-2">
        <div className="h-2 rounded-full bg-warm-100 dark:bg-warm-800 w-full" />
        <div className="h-2 rounded-full bg-warm-100 dark:bg-warm-800 w-[92%]" />
        <div className="h-2 rounded-full bg-warm-100 dark:bg-warm-800 w-[88%]" />
        <div className="h-2 rounded-full bg-warm-100 dark:bg-warm-800 w-[95%]" />
        <div className="h-2 rounded-full bg-warm-100 dark:bg-warm-800 w-[70%]" />
      </div>
      <div className="mt-4 p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              1 claim needs support
            </p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5 leading-snug">
              &ldquo;We&apos;ve served over 1,200 youth&rdquo; — no source in
              org profile
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScorecardMockup() {
  const criteria = [
    { name: "Alignment with Funder", score: 18, max: 20, pct: 90 },
    { name: "Project Design", score: 22, max: 25, pct: 88 },
    { name: "Evaluation Plan", score: 14, max: 20, pct: 70 },
    { name: "Budget Justification", score: 17, max: 20, pct: 85 },
  ];
  return (
    <div className="rounded-xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-warm-100 dark:border-warm-800">
        <div>
          <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">
            Quality Score
          </p>
          <p className="text-xs text-warm-500">vs. funder&apos;s rubric</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-brand-teal-text tabular-nums leading-none">
            71
            <span className="text-sm text-warm-500 font-normal">/85</span>
          </p>
          <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
            Needs work
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {criteria.map((c) => (
          <div key={c.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-warm-700 dark:text-warm-300">
                {c.name}
              </span>
              <span className="text-xs tabular-nums text-warm-900 dark:text-warm-50">
                {c.score}/{c.max}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-warm-100 dark:bg-warm-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  c.pct >= 85
                    ? "bg-green-500"
                    : c.pct >= 70
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${c.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-[11px] text-warm-600 dark:text-warm-400">
        <Target className="h-3 w-3 text-brand-teal" aria-hidden="true" />
        +4 pts: add evaluation methodology
      </div>
    </div>
  );
}

export function ProductPreview() {
  return (
    <section className="py-20 md:py-24 px-4 bg-warm-50 dark:bg-warm-900/30">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-xs font-semibold text-brand-teal-text tracking-[0.2em] uppercase">
              See it in action
            </p>
            <h2 className="mt-3 text-4xl md:text-5xl font-bold tracking-[-0.02em] text-warm-900 dark:text-warm-50 leading-[1.05]">
              The product, not
              <br />
              a pitch deck.
            </h2>
            <p className="mt-5 text-warm-600 dark:text-warm-400 leading-relaxed max-w-md">
              Every screenshot below is a real surface you use inside GrantIQ.
              No mocked-up marketing shots — this is exactly what you get after
              signup.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 mt-8 px-6 py-3 rounded-full bg-warm-900 text-white hover:bg-warm-800 dark:bg-warm-50 dark:text-warm-900 dark:hover:bg-warm-100 font-semibold text-sm transition-colors group/cta"
            >
              Explore the platform
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <MatchesMockup />
            </div>
            <DraftMockup />
            <ScorecardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
