// src/components/marketing/grant-writer-questions.tsx
//
// Static row of real questions nonprofit grant writers ask. Adapted
// from the vercep-feature-1 pattern, stripped of:
// - marquee animation (we already have 2 marquees)
// - 4-column feature grid below (duplicate of Capabilities accordion)
// - generic agency copy ("We make things simple / real results")
// - fictional icon set
//
// Keep only the core idea: "we know the questions you're asking."
// Pure static layout, warm palette, no motion.

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const QUESTIONS = [
  "Will my nonprofit qualify for federal grants?",
  "What is NTEE code and do I need one?",
  "How do I write a needs statement?",
  "What counts as match funding?",
  "Do I need a 501(c)(3) to apply?",
  "How long should my project narrative be?",
  "What is a logic model?",
  "Can I apply to multiple funders at once?",
  "How do I budget for indirect costs?",
  "Do foundations prefer new or established orgs?",
  "What is a letter of intent?",
  "How do I write an evaluation plan?",
];

export function GrantWriterQuestions() {
  return (
    <section className="py-16 md:py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal-text">
            The questions you&apos;re actually asking
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-[-0.02em] text-warm-900 dark:text-warm-50 leading-[1.1]">
            Your grant questions, answered by the product.
          </h2>
          <p className="mt-4 text-warm-600 dark:text-warm-400 leading-relaxed">
            We pulled these from real conversations with nonprofit directors.
            Every one of them has an answer inside GrantIQ — usually delivered
            without you having to ask.
          </p>
        </div>

        <ul className="flex flex-wrap justify-center gap-2.5 max-w-5xl mx-auto">
          {QUESTIONS.map((q) => (
            <li
              key={q}
              className="inline-flex items-center px-4 py-2 rounded-full border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 text-sm text-warm-700 dark:text-warm-300 hover:border-brand-teal/40 hover:text-warm-900 dark:hover:text-warm-50 transition-colors duration-150"
            >
              {q}
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-center mt-10">
          <Link
            href="/check"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-warm-900 dark:text-warm-50 hover:text-brand-teal-text transition-colors group/link"
          >
            Ask yours in the eligibility check
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
