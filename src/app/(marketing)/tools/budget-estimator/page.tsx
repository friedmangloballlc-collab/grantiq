"use client";

import { useState } from "react";
import { DollarSign, ArrowRight, TrendingUp, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const INDUSTRIES = [
  { value: "healthcare", label: "Healthcare & Medical", avgGrant: 85000, multiplier: 1.3 },
  { value: "education", label: "Education & Youth", avgGrant: 65000, multiplier: 1.2 },
  { value: "environment", label: "Environment & Conservation", avgGrant: 75000, multiplier: 1.1 },
  { value: "arts", label: "Arts & Culture", avgGrant: 35000, multiplier: 0.8 },
  { value: "housing", label: "Housing & Community Dev", avgGrant: 95000, multiplier: 1.4 },
  { value: "workforce", label: "Workforce Development", avgGrant: 70000, multiplier: 1.2 },
  { value: "technology", label: "Technology & Innovation", avgGrant: 120000, multiplier: 1.5 },
  { value: "social_services", label: "Social Services", avgGrant: 55000, multiplier: 1.0 },
  { value: "veterans", label: "Veterans Services", avgGrant: 80000, multiplier: 1.2 },
  { value: "food", label: "Food & Agriculture", avgGrant: 60000, multiplier: 1.0 },
  { value: "other", label: "Other", avgGrant: 50000, multiplier: 1.0 },
];

const BUDGET_RANGES = [
  { value: "under100k", label: "Under $100K", base: 75000, maxGrants: 3 },
  { value: "100k_500k", label: "$100K — $500K", base: 250000, maxGrants: 5 },
  { value: "500k_1m", label: "$500K — $1M", base: 750000, maxGrants: 8 },
  { value: "1m_5m", label: "$1M — $5M", base: 2500000, maxGrants: 12 },
  { value: "over5m", label: "Over $5M", base: 7500000, maxGrants: 20 },
];

function formatDollars(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

export default function BudgetEstimatorPage() {
  const [industry, setIndustry] = useState("");
  const [budget, setBudget] = useState("");
  const [hasApplied, setHasApplied] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);

  const ind = INDUSTRIES.find((i) => i.value === industry);
  const bud = BUDGET_RANGES.find((b) => b.value === budget);
  const applied = hasApplied === "yes";

  const estimatedGrants = bud ? Math.round(bud.maxGrants * (ind?.multiplier ?? 1)) : 0;
  const avgAward = ind?.avgGrant ?? 50000;
  const estimatedFunding = estimatedGrants * avgAward;
  const grantAsPercent = bud ? Math.round((estimatedFunding / bud.base) * 100) : 0;
  const experienceBonus = applied ? 1.2 : 0.7;
  const adjustedFunding = Math.round(estimatedFunding * experienceBonus);

  const canSubmit = industry && budget && hasApplied;

  return (
    <div className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-brand-teal/10 text-brand-teal mb-4">
            Free Tool
          </span>
          <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50">
            Grant Budget Estimator
          </h1>
          <p className="text-warm-500 mt-2">
            Estimate how much grant funding your organization could realistically pursue based on your size, industry, and experience.
          </p>
        </div>

        <div className="space-y-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-2">
              What industry does your organization serve?
            </label>
            <select
              value={industry}
              onChange={(e) => { setIndustry(e.target.value); setSubmitted(false); }}
              className="w-full rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 px-4 py-3 text-sm text-warm-900 dark:text-warm-50"
            >
              <option value="">Select industry...</option>
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-2">
              What is your annual operating budget?
            </label>
            <select
              value={budget}
              onChange={(e) => { setBudget(e.target.value); setSubmitted(false); }}
              className="w-full rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 px-4 py-3 text-sm text-warm-900 dark:text-warm-50"
            >
              <option value="">Select budget range...</option>
              {BUDGET_RANGES.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-2">
              Have you applied for grants before?
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => { setHasApplied("yes"); setSubmitted(false); }}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${
                  hasApplied === "yes"
                    ? "bg-brand-teal/10 border-brand-teal text-brand-teal"
                    : "border-warm-200 text-warm-500 hover:border-brand-teal dark:border-warm-700"
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => { setHasApplied("no"); setSubmitted(false); }}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${
                  hasApplied === "no"
                    ? "bg-brand-teal/10 border-brand-teal text-brand-teal"
                    : "border-warm-200 text-warm-500 hover:border-brand-teal dark:border-warm-700"
                }`}
              >
                No, first time
              </button>
            </div>
          </div>
        </div>

        {canSubmit && !submitted && (
          <div className="text-center">
            <Button
              onClick={() => setSubmitted(true)}
              className="bg-brand-teal hover:bg-brand-teal-dark text-white px-8"
            >
              Estimate My Grant Potential
            </Button>
          </div>
        )}

        {submitted && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-xl border border-warm-200 dark:border-warm-700 p-4">
                <DollarSign className="h-5 w-5 text-brand-teal mx-auto mb-2" />
                <p className="text-2xl font-bold text-warm-900 dark:text-warm-50">{formatDollars(adjustedFunding)}</p>
                <p className="text-xs text-warm-500 mt-1">Estimated Annual Grant Potential</p>
              </div>
              <div className="rounded-xl border border-warm-200 dark:border-warm-700 p-4">
                <TrendingUp className="h-5 w-5 text-brand-teal mx-auto mb-2" />
                <p className="text-2xl font-bold text-warm-900 dark:text-warm-50">{estimatedGrants}</p>
                <p className="text-xs text-warm-500 mt-1">Grants to Target</p>
              </div>
              <div className="rounded-xl border border-warm-200 dark:border-warm-700 p-4">
                <PieChart className="h-5 w-5 text-brand-teal mx-auto mb-2" />
                <p className="text-2xl font-bold text-warm-900 dark:text-warm-50">{grantAsPercent}%</p>
                <p className="text-xs text-warm-500 mt-1">of Budget from Grants</p>
              </div>
            </div>

            <div className="rounded-xl border border-warm-200 dark:border-warm-700 p-5">
              <h3 className="text-sm font-semibold text-warm-900 dark:text-warm-50 mb-2">What this means</h3>
              <p className="text-sm text-warm-600 dark:text-warm-400 leading-relaxed">
                Based on {ind?.label} organizations with a {bud?.label} budget{applied ? " and prior grant experience" : ""},
                you could realistically target <strong>{estimatedGrants} grants</strong> annually
                with an average award of <strong>{formatDollars(avgAward)}</strong>.
                {!applied && " First-time applicants typically start with smaller, less competitive grants to build a track record."}
                {applied && " Your experience gives you an advantage — focus on mid-to-large grants where your track record matters."}
              </p>
            </div>

            <div className="rounded-xl bg-brand-teal/5 border border-brand-teal/20 p-5">
              <h3 className="text-sm font-semibold text-brand-teal mb-2">Recommended strategy</h3>
              <ul className="text-sm text-warm-600 dark:text-warm-400 space-y-1.5">
                <li>&#x2022; Apply to {Math.ceil(estimatedGrants * 0.3)} foundation grants ({formatDollars(avgAward * 0.6)} avg)</li>
                <li>&#x2022; Apply to {Math.ceil(estimatedGrants * 0.3)} state/local grants ({formatDollars(avgAward * 0.8)} avg)</li>
                <li>&#x2022; Apply to {Math.ceil(estimatedGrants * 0.2)} federal grants ({formatDollars(avgAward * 1.5)} avg)</li>
                <li>&#x2022; Apply to {Math.max(1, Math.floor(estimatedGrants * 0.2))} corporate/CSR grants ({formatDollars(avgAward * 0.4)} avg)</li>
              </ul>
            </div>

            <div className="text-center pt-4">
              <p className="text-sm text-warm-500 mb-4">
                GrantAQ finds and matches you with the specific grants in each category.
              </p>
              <Button
                className="bg-brand-teal hover:bg-brand-teal-dark text-white"
                render={
                  <Link href="/signup">
                    Find My Grants <ArrowRight className="ml-2 h-4 w-4 inline" />
                  </Link>
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
