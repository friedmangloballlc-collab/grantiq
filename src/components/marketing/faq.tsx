"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
    a: "GrantAQ uses AI to analyze your organization's profile — mission, industry, location, budget, and programs — and scores every grant in our database against your eligibility criteria. You get a personalized match score (0-100) for each grant, ranked by fit.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. All data is encrypted at rest and in transit. We use Supabase with row-level security, meaning your organization's data is isolated and only accessible to your team. We never share your data with third parties or funders without your explicit consent.",
  },
  {
    q: "What's included in the free plan?",
    a: "The Explorer plan (free forever) includes 1 match run per month (top 5 results), access to federal grants, 1 readiness score, 3 pipeline items, and 5 Grantie AI chats per day. No credit card required.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. All paid plans are month-to-month with no long-term commitment. Cancel anytime from your Settings page. Annual plans offer a discount and can be canceled before renewal.",
  },
  {
    q: "Does GrantAQ write my grant application?",
    a: "On the Applicant plan ($199/mo) and above, our AI Writing Engine generates full grant drafts, letters of intent, budget narratives, and compliance checks. All AI-generated content should be reviewed before submission.",
  },
  {
    q: "How is GrantAQ different from free grant databases?",
    a: "Free databases give you a list. GrantAQ gives you a strategy. We score every grant against your specific profile, track deadlines, manage your pipeline, analyze your win rate, and generate applications — all from one platform.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 px-4" id="faq">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-warm-900 dark:text-warm-50 mb-2">
          Frequently Asked Questions
        </h2>
        <p className="text-center text-warm-500 mb-12">
          Everything you need to know about GrantAQ
        </p>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="border border-warm-200 dark:border-warm-700 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-warm-900 dark:text-warm-50 hover:bg-warm-50 dark:hover:bg-warm-800/50 transition-colors"
              >
                {faq.q}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-warm-400 shrink-0 ml-4 transition-transform",
                    openIndex === i && "rotate-180"
                  )}
                />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-4 text-sm text-warm-600 dark:text-warm-400 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
