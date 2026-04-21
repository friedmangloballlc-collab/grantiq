"use client";

import { useState } from "react";
import { ChevronDown, MessageSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "What types of organizations can use GrantAQ?",
    a: "GrantAQ works for 501(c)(3) nonprofits, small businesses (LLC, S-Corp, C-Corp), sole proprietorships, and government agencies. Our database includes federal, state, foundation, and corporate grants across all entity types.",
  },
  {
    q: "Do I need a 501(c)(3) to find grants?",
    a: "No. While many foundation grants require 501(c)(3) status, there are thousands of grants available to small businesses, LLCs, and other entity types. GrantAQ matches you based on your actual eligibility — not just your tax status.",
  },
  {
    q: "How does the AI matching work?",
    a: "GrantAQ analyzes your organization's profile — mission, industry, location, budget, and programs — and scores every grant in our database against your eligibility criteria. You get a personalized match score (0-100) for each grant, ranked by fit.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. All data is encrypted at rest and in transit. We use Supabase with row-level security, meaning your organization's data is isolated and only accessible to your team. We never share your data with third parties or funders without your explicit consent.",
  },
  {
    q: "What's included in the free plan?",
    a: "The free tier includes 1 match run per month (top 5 results), access to federal grants, 1 readiness score, 3 pipeline items, and 5 Grantie AI chats per day. No credit card required.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. All paid plans are month-to-month with no long-term commitment. Cancel anytime from your Settings page. Annual plans offer a 20% discount and can be canceled before renewal.",
  },
  {
    q: "Does GrantAQ write my grant application?",
    a: "Yes. Our AI Writing Engine generates full grant drafts, letters of intent, budget narratives, and compliance checks. Every AI-generated claim is fact-checked against the source RFP and your org profile. Tier 2 adds coherence and compliance review; Tier 3 adds a senior grant writer's review before you submit.",
  },
  {
    q: "Is everything done by AI?",
    a: "No. AI handles drafting, matching, scoring, and fact-checking. On Tier 2 and Tier 3, experienced grant writers review the output. Think of it as your grant team: AI does the heavy lifting, humans ensure quality.",
  },
  {
    q: "How is GrantAQ different from Candid or free grant databases?",
    a: "Free databases (including Candid's Foundation Directory) give you a list — and Candid's data is typically about 2 years out of date. GrantAQ gives you a strategy. We verify grants nightly, score every one against your specific profile, track deadlines, auto-build a compliance calendar when you win, and learn from every outcome to improve your next draft.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 px-4" id="faq">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-12 lg:gap-16">
          {/* Left anchor — sticky on desktop so it stays visible while
              the user scrolls through questions. Inspired by the Aixora
              FAQ visual anchor, translated to our palette without a
              mascot illustration. */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="relative rounded-3xl border border-warm-200 dark:border-warm-800 bg-gradient-to-br from-white via-warm-50 to-brand-teal/5 dark:from-warm-900 dark:via-warm-900 dark:to-brand-teal/10 p-8 overflow-hidden">
              <div
                aria-hidden="true"
                className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl bg-brand-teal/20"
              />
              <div className="relative">
                <p className="text-xs font-semibold text-brand-teal-text tracking-[0.2em] uppercase">
                  Any questions?
                </p>
                <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-warm-900 dark:text-warm-50 leading-[1.1]">
                  Answers before
                  <br />
                  you commit.
                </h2>
                <p className="mt-4 text-sm text-warm-600 dark:text-warm-400 leading-relaxed">
                  We&apos;ve written this section against real questions from real
                  nonprofit directors. If yours isn&apos;t here, just ask.
                </p>
                <div className="mt-6 flex items-center gap-2">
                  <MessageSquare
                    className="h-4 w-4 text-brand-teal"
                    aria-hidden="true"
                  />
                  <Link
                    href="mailto:hello@grantaq.com"
                    className="text-sm font-medium text-brand-teal-text hover:underline"
                  >
                    hello@grantaq.com
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Question list */}
          <div className="space-y-3">
            {FAQS.map((faq, i) => {
              const open = openIndex === i;
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl border bg-white dark:bg-warm-900 overflow-hidden transition-[box-shadow] duration-200",
                    open
                      ? "border-brand-teal/40 shadow-sm"
                      : "border-warm-200 dark:border-warm-800"
                  )}
                >
                  <button
                    onClick={() => setOpenIndex(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                    aria-expanded={open}
                  >
                    <span className="text-sm md:text-base font-medium text-warm-900 dark:text-warm-50">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-warm-400 shrink-0 transition-transform duration-200",
                        open && "rotate-180 text-brand-teal"
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  {open && (
                    <div className="px-5 pb-5 text-sm text-warm-600 dark:text-warm-400 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
