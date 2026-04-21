"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Minus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "annual";

interface Tier {
  name: string;
  tagline: string;
  monthly: number;
  annual: number; // per-month price when billed annually
  summary: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
  contactOnly?: boolean;
}

const TIERS: Tier[] = [
  {
    name: "Free",
    tagline: "Try before you commit",
    monthly: 0,
    annual: 0,
    summary: "A real trial with real grants, no credit card.",
    features: [
      "1 match run/month (top 5 federal grants)",
      "1 readiness score",
      "3 pipeline items",
      "5 Grantie chats per day",
    ],
    cta: "Start Free",
    href: "/signup",
  },
  {
    name: "Starter",
    tagline: "For solo grant writers",
    monthly: 79,
    annual: 63,
    summary: "Full library + foundation grants. Most used by freelance grant writers.",
    features: [
      "Full grant library (federal + foundation)",
      "10 pipeline items",
      "Calendar + workback schedule",
      "5 document uploads",
      "15 Grantie chats per day",
    ],
    cta: "Get Started",
    href: "/signup?plan=starter",
  },
  {
    name: "Pro",
    tagline: "For nonprofits writing 1+ grants/month",
    monthly: 149,
    annual: 119,
    summary: "Everything you need to submit consistently — minus the writing itself.",
    features: [
      "Everything in Starter",
      "Unlimited scorecard evaluations",
      "Document vault (unlimited uploads)",
      "A–Z readiness tracking",
      "Full analytics",
      "30 Grantie chats per day",
    ],
    cta: "Get Started",
    href: "/signup?plan=pro",
    highlighted: true,
  },
  {
    name: "Growth",
    tagline: "When you need AI to write for you",
    monthly: 249,
    annual: 199,
    summary: "AI-drafted applications, compliance reviews, and per-draft expert options.",
    features: [
      "Everything in Pro",
      "AI writing + automated compliance checks",
      "Per-draft expert review (à la carte)",
      "Unlimited pipeline items",
      "Budget narratives",
      "Full Confidence eligible",
      "Priority support",
    ],
    cta: "Get Started",
    href: "/signup?plan=growth",
  },
  {
    name: "Enterprise",
    tagline: "For teams writing 5+ applications/month",
    monthly: 499,
    annual: 399,
    summary: "Dedicated grant writer assigned to your team. Call us — we'll tailor it.",
    features: [
      "Everything in Growth",
      "Dedicated grant writer on your team",
      "Unlimited team members",
      "5 AI drafts per month included",
      "API access",
      "Dedicated customer success manager",
    ],
    cta: "Talk to Sales",
    href: "mailto:hello@grantaq.com?subject=GrantAQ%20Enterprise",
    contactOnly: true,
  },
];

const COMPARE_ROWS: {
  label: string;
  grantiq: string | true;
  candid: string | false;
  grantiqNote?: string;
}[] = [
  { label: "Data freshness", grantiq: "Verified nightly", candid: "~2 years out of date" },
  { label: "Writes the application for you", grantiq: true, candid: false },
  { label: "Compliance calendar on award", grantiq: "Auto-generated", candid: false },
  { label: "Funder-specific win/loss learning", grantiq: true, candid: false },
  { label: "Starts at", grantiq: "$0/mo", candid: "$220–$1,500/yr" },
];

function formatPrice(n: number): string {
  if (n === 0) return "$0";
  return `$${n}`;
}

export function PricingTable() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <section className="py-20 px-4" id="pricing">
      <div className="max-w-6xl mx-auto">
        {/* Risk-reversal bar — premium pricing ($249 minimum) requires
            visible trust signals. Four numeric proof points appear
            before the tier cards so visitors evaluate value before
            sticker shock hits. This is the single highest-leverage
            addition we can make to the pricing page without a
            testimonial roster. */}
        <div className="mb-10 rounded-2xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-6 md:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
            <div className="text-center md:text-left">
              <p className="text-2xl md:text-3xl font-bold text-warm-900 dark:text-warm-50 tabular-nums tracking-tight">
                6,000+
              </p>
              <p className="text-xs font-medium text-warm-500 mt-1">
                active grants
                <br />
                verified nightly
              </p>
            </div>
            <div className="text-center md:text-left">
              <p className="text-2xl md:text-3xl font-bold text-warm-900 dark:text-warm-50 tabular-nums tracking-tight">
                60s
              </p>
              <p className="text-xs font-medium text-warm-500 mt-1">
                free eligibility check
                <br />
                no signup required
              </p>
            </div>
            <div className="text-center md:text-left">
              <p className="text-2xl md:text-3xl font-bold text-warm-900 dark:text-warm-50 tabular-nums tracking-tight">
                $0
              </p>
              <p className="text-xs font-medium text-warm-500 mt-1">
                start free forever
                <br />
                upgrade only when you&apos;re drafting
              </p>
            </div>
            <div className="text-center md:text-left">
              <p className="text-2xl md:text-3xl font-bold text-brand-teal-text tabular-nums tracking-tight">
                Any time
              </p>
              <p className="text-xs font-medium text-warm-500 mt-1">
                cancel any subscription
                <br />
                no long-term contracts
              </p>
            </div>
          </div>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div
            role="tablist"
            aria-label="Billing cycle"
            className="inline-flex items-center rounded-full border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-1"
          >
            <button
              role="tab"
              aria-selected={cycle === "monthly"}
              onClick={() => setCycle("monthly")}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
                cycle === "monthly"
                  ? "bg-warm-900 dark:bg-warm-50 text-white dark:text-warm-900"
                  : "text-warm-600 dark:text-warm-400 hover:text-warm-900 dark:hover:text-warm-50"
              )}
            >
              Monthly
            </button>
            <button
              role="tab"
              aria-selected={cycle === "annual"}
              onClick={() => setCycle("annual")}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-2",
                cycle === "annual"
                  ? "bg-warm-900 dark:bg-warm-50 text-white dark:text-warm-900"
                  : "text-warm-600 dark:text-warm-400 hover:text-warm-900 dark:hover:text-warm-50"
              )}
            >
              Annual
              <span className="text-xs font-semibold text-brand-teal bg-brand-teal/10 px-1.5 py-0.5 rounded">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Primary four tiers — dedicated row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIERS.filter((t) => !t.contactOnly).map((tier) => {
            const price = cycle === "annual" ? tier.annual : tier.monthly;
            return (
              <article
                key={tier.name}
                className={cn(
                  "relative rounded-xl border bg-white dark:bg-warm-900 p-6 flex flex-col",
                  tier.highlighted
                    ? "border-brand-teal ring-2 ring-brand-teal/20 shadow-sm"
                    : "border-warm-200 dark:border-warm-800"
                )}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-6 bg-brand-teal text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <header className="mb-4">
                  <h3 className="text-lg font-semibold text-warm-900 dark:text-warm-50">
                    {tier.name}
                  </h3>
                  <p className="text-xs text-warm-500 mt-0.5">{tier.tagline}</p>
                </header>
                <div className="mb-2">
                  <span className="text-4xl font-bold tracking-tight text-warm-900 dark:text-warm-50 tabular-nums">
                    {formatPrice(price)}
                  </span>
                  {tier.monthly > 0 && (
                    <span className="text-warm-500 text-sm ml-1">/month</span>
                  )}
                </div>
                {tier.monthly > 0 && cycle === "annual" && (
                  <p className="text-xs text-warm-500 mb-4">
                    billed annually at ${tier.annual * 12}/year
                  </p>
                )}
                {tier.monthly === 0 && (
                  <p className="text-xs text-warm-500 mb-4">forever free</p>
                )}
                <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">
                  {tier.summary}
                </p>
                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-warm-700 dark:text-warm-300"
                    >
                      <Check
                        className="h-4 w-4 text-brand-teal shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    "w-full",
                    tier.highlighted
                      ? "bg-brand-teal hover:bg-brand-teal-dark text-white"
                      : ""
                  )}
                  variant={tier.highlighted ? "default" : "outline"}
                  render={<Link href={tier.href}>{tier.cta}</Link>}
                />
              </article>
            );
          })}
        </div>

        {/* Enterprise — visually distinct, horizontal layout */}
        {TIERS.filter((t) => t.contactOnly).map((tier) => {
          const price = cycle === "annual" ? tier.annual : tier.monthly;
          return (
            <div
              key={tier.name}
              className="mt-6 rounded-xl border border-warm-200 dark:border-warm-800 bg-warm-50 dark:bg-warm-900/50 p-6 sm:p-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-xl font-semibold text-warm-900 dark:text-warm-50">
                      {tier.name}
                    </h3>
                    <span className="text-xs text-warm-500">{tier.tagline}</span>
                  </div>
                  <p className="text-sm text-warm-600 dark:text-warm-400 mt-2 max-w-xl">
                    {tier.summary}
                  </p>
                  <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                    {tier.features.slice(0, 4).map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-sm text-warm-700 dark:text-warm-300"
                      >
                        <Check
                          className="h-4 w-4 text-brand-teal shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-3 shrink-0">
                  <div>
                    <span className="text-3xl font-bold text-warm-900 dark:text-warm-50 tabular-nums">
                      {formatPrice(price)}
                    </span>
                    <span className="text-warm-500 text-sm ml-1">/month</span>
                    {cycle === "annual" && (
                      <p className="text-xs text-warm-500 mt-0.5 text-right">
                        billed annually
                      </p>
                    )}
                  </div>
                  <Button
                    variant="default"
                    className="bg-warm-900 dark:bg-warm-50 text-white dark:text-warm-900 hover:bg-warm-800 dark:hover:bg-warm-100"
                    render={<Link href={tier.href}>{tier.cta}</Link>}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Candid comparison — the real differentiator */}
        <div className="mt-20">
          <h2 className="text-2xl font-semibold text-warm-900 dark:text-warm-50 text-center">
            Why pay more for Candid to give you stale data?
          </h2>
          <p className="text-center text-warm-500 mt-2 max-w-2xl mx-auto text-sm">
            Candid&apos;s Foundation Directory Online is the incumbent — but the data is
            typically about 2 years out of date, and it only tells you grants exist.
            It doesn&apos;t write them.
          </p>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full max-w-3xl mx-auto text-sm">
              <thead>
                <tr className="border-b border-warm-200 dark:border-warm-800">
                  <th className="py-3 text-left font-medium text-warm-500 uppercase tracking-wide text-xs"></th>
                  <th className="py-3 text-center font-semibold text-warm-900 dark:text-warm-50">
                    GrantAQ
                  </th>
                  <th className="py-3 text-center font-medium text-warm-500">
                    Candid / FDO
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-warm-100 dark:border-warm-800/50 last:border-0"
                  >
                    <td className="py-3 text-warm-700 dark:text-warm-300">
                      {row.label}
                    </td>
                    <td className="py-3 text-center">
                      {row.grantiq === true ? (
                        <Check
                          className="h-4 w-4 text-brand-teal inline"
                          aria-label="Yes"
                        />
                      ) : (
                        <span className="font-medium text-warm-900 dark:text-warm-50">
                          {row.grantiq}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center text-warm-500">
                      {row.candid === false ? (
                        <Minus
                          className="h-4 w-4 text-warm-400 inline"
                          aria-label="No"
                        />
                      ) : (
                        <span>{row.candid}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trust row */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">
              Cancel anytime
            </p>
            <p className="text-xs text-warm-500 mt-1">
              Monthly plans month-to-month. Annual plans prorated.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">
              No add-on fees
            </p>
            <p className="text-xs text-warm-500 mt-1">
              Everything in your plan is included. AI writing billed per draft.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">
              Grant writers on staff
            </p>
            <p className="text-xs text-warm-500 mt-1">
              Growth &amp; Enterprise get expert human review on every draft.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
