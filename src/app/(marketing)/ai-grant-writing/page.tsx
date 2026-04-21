import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  Clock,
  ShieldCheck,
  FileCheck,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "AI Grant Writing — GrantIQ",
  description:
    "We write your grant application. You approve it. AI drafts the narrative, our auditor flags every ungrounded claim, and the quality scorer measures it against the funder's rubric before you submit.",
  alternates: {
    canonical: "https://grantaq.com/ai-grant-writing",
  },
};

const HOW_IT_WORKS = [
  {
    icon: Sparkles,
    title: "AI drafts the narrative",
    body: "Upload the RFP and your org profile. Our engine generates every section — needs statement, project description, budget narrative, evaluation plan — using your funder's specific language and priorities.",
  },
  {
    icon: ShieldCheck,
    title: "Hallucination auditor flags invented claims",
    body: "Every factual claim is checked against the RFP, your 990, and your org profile. Ungrounded statements get flagged before you see them. No invented statistics, no made-up partnerships, no fabricated outcomes.",
  },
  {
    icon: FileCheck,
    title: "Quality scorer tells you if it's submittable",
    body: "The draft gets scored 0-100 against the funder's actual rubric (extracted from the RFP, or inferred when unstated). You see per-criterion breakdown and the top improvements ranked by point impact.",
  },
];

const TIERS = [
  {
    name: "Tier 1 — AI Only",
    price: "$249",
    grantType: "state or foundation grant",
    turnaround: "30 minutes",
    includes: [
      "AI-generated draft (all sections)",
      "Hallucination audit",
      "Quality scorecard",
      "DOCX + PDF export",
    ],
    highlighted: false,
    href: "/signup?plan=growth",
  },
  {
    name: "Tier 2 — AI + Audit",
    price: "$497",
    grantType: "state or foundation grant",
    turnaround: "1 hour",
    includes: [
      "Everything in Tier 1",
      "Coherence check across sections",
      "Compliance review against funder requirements",
      "Targeted rewrite of flagged sections",
    ],
    highlighted: true,
    href: "/signup?plan=growth",
  },
  {
    name: "Tier 3 — AI + Expert",
    price: "$997",
    grantType: "state or foundation grant",
    turnaround: "24-48 hours",
    includes: [
      "Everything in Tier 2",
      "Senior grant writer review",
      "Reviewer-panel simulation",
      "Submission-ready final polish",
    ],
    highlighted: false,
    href: "/signup?plan=growth",
  },
];

const FAQ = [
  {
    q: "Do you replace my grant writer?",
    a: "No. We compress the busywork — drafting boilerplate, checking consistency, verifying claims — so the humans on your team spend their time on strategy and relationships. Tier 3 includes an expert reviewer; Tier 1/2 are drafting tools for teams that already know what they want to say.",
  },
  {
    q: "How does this compare to just using ChatGPT?",
    a: "ChatGPT doesn't know your 990, your funder's past giving, your evaluation methodology, or the specific scoring rubric the program officer uses. We do — and the auditor will catch ChatGPT's hallucinations before they reach your funder. We've seen drafts where ChatGPT invented a partnership that didn't exist; our auditor flags it every time.",
  },
  {
    q: "Will funders detect AI?",
    a: "Our output reads like a human wrote it because it's grounded in your real org voice (from documents you upload) and your specific funder's priorities (from their RFP + 990). That said: you should always review and edit. The draft is a starting point, not a send-as-is.",
  },
  {
    q: "Federal grants?",
    a: "Federal pricing is higher ($499/$997/$1997 respectively) because federal RFPs are longer, compliance requirements are stricter, and the stakes are higher. Contact us for SBIR/STTR or complex cooperative agreements.",
  },
];

export default function AIGrantWritingPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold text-brand-teal-text tracking-[0.2em] uppercase">
            AI Grant Writing
          </p>
          <h1 className="mt-4 text-4xl md:text-6xl font-bold tracking-tight text-warm-900 dark:text-warm-50 leading-[1.05]">
            We write your grant.
            <br />
            <span className="text-brand-teal">You approve it.</span>
          </h1>
          <p className="text-lg md:text-xl text-warm-600 dark:text-warm-400 mt-6 max-w-2xl mx-auto leading-relaxed">
            AI drafts every section in minutes. Our auditor flags invented
            claims before you see them. A quality score tells you if it&apos;s
            ready to submit — or exactly what to fix.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
            <Button
              size="lg"
              className="!bg-warm-900 !text-white hover:!bg-warm-800 dark:!bg-warm-50 dark:!text-warm-900 dark:hover:!bg-warm-100 !h-14 !px-8 !py-4 text-base font-semibold rounded-full gap-2 group/cta"
              render={
                <Link href="/signup?plan=growth">
                  Start a draft — from $249
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              }
            />
            <Button
              size="lg"
              variant="outline"
              className="!h-14 !px-8 !py-4 text-base font-medium rounded-full border-warm-300 dark:border-warm-700"
              render={<Link href="#how-it-works">How it works</Link>}
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-warm-500">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-brand-teal" />
              30 minutes to first draft
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-teal" />
              Every claim source-verified
            </span>
            <span className="flex items-center gap-1.5">
              <FileCheck className="h-3.5 w-3.5 text-brand-teal" />
              Scored against the funder&apos;s rubric
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="py-20 px-4 bg-warm-50 dark:bg-warm-900/30 scroll-mt-16"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-warm-900 dark:text-warm-50 tracking-tight">
              Three layers between you and a bad submission
            </h2>
            <p className="text-warm-600 dark:text-warm-400 mt-3 max-w-2xl mx-auto">
              Most AI writers stop at the draft. We don&apos;t. Each stage
              catches a different class of failure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.title}
                className="rounded-xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-teal/10 flex items-center justify-center">
                    <step.icon
                      className="h-5 w-5 text-brand-teal-text"
                      aria-hidden="true"
                    />
                  </div>
                  <span className="text-xs font-semibold text-warm-500 tabular-nums">
                    STEP {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-warm-900 dark:text-warm-50 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-warm-600 dark:text-warm-400 leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tier pricing focused on writing */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-warm-900 dark:text-warm-50 tracking-tight">
              Pay per draft. No subscription required.
            </h2>
            <p className="text-warm-600 dark:text-warm-400 mt-3 max-w-2xl mx-auto">
              Writing tiers are one-time per application. Pick the level of
              review you want.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TIERS.map((tier) => (
              <article
                key={tier.name}
                className={`relative rounded-xl border bg-white dark:bg-warm-900 p-6 flex flex-col ${
                  tier.highlighted
                    ? "border-brand-teal ring-2 ring-brand-teal/20 shadow-sm"
                    : "border-warm-200 dark:border-warm-800"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-6 bg-brand-teal text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most chosen
                  </div>
                )}
                <h3 className="text-lg font-semibold text-warm-900 dark:text-warm-50">
                  {tier.name}
                </h3>
                <div className="mt-3 mb-4">
                  <span className="text-4xl font-bold tracking-tight text-warm-900 dark:text-warm-50 tabular-nums">
                    {tier.price}
                  </span>
                  <p className="text-xs text-warm-500 mt-1">
                    per {tier.grantType} · {tier.turnaround} turnaround
                  </p>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {tier.includes.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-warm-700 dark:text-warm-300"
                    >
                      <CheckCircle2
                        className="h-4 w-4 text-brand-teal shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    tier.highlighted
                      ? "bg-brand-teal hover:bg-brand-teal-dark text-white"
                      : ""
                  }`}
                  variant={tier.highlighted ? "default" : "outline"}
                  render={<Link href={tier.href}>Start a draft</Link>}
                />
              </article>
            ))}
          </div>
          <p className="text-center text-xs text-warm-500 mt-6">
            Federal and SBIR/STTR grants priced separately ($499 / $997 /
            $1,997 respectively).
          </p>
        </div>
      </section>

      {/* FAQ — answers the three real objections */}
      <section className="py-20 px-4 bg-warm-50 dark:bg-warm-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50 text-center mb-10 tracking-tight">
            Honest answers to the questions you should be asking
          </h2>
          <div className="space-y-6">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-6 open:shadow-sm transition-[box-shadow] duration-200"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                  <h3 className="text-base font-semibold text-warm-900 dark:text-warm-50">
                    {item.q}
                  </h3>
                  <span
                    aria-hidden="true"
                    className="text-brand-teal text-xl font-light leading-none group-open:rotate-45 transition-transform duration-200"
                  >
                    +
                  </span>
                </summary>
                <p className="text-sm text-warm-600 dark:text-warm-400 leading-relaxed mt-4">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-24 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50 tracking-tight">
            One grant this month would cover this for years.
          </h2>
          <p className="text-warm-600 dark:text-warm-400 mt-4">
            Start with a $249 Tier 1 draft. If it&apos;s not useful, email us
            and we&apos;ll refund it.
          </p>
          <div className="mt-8">
            <Button
              size="lg"
              className="!bg-warm-900 !text-white hover:!bg-warm-800 dark:!bg-warm-50 dark:!text-warm-900 dark:hover:!bg-warm-100 !h-14 !px-8 !py-4 text-base font-semibold rounded-full gap-2 group/cta"
              render={
                <Link href="/signup?plan=growth">
                  Start a draft
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              }
            />
          </div>
        </div>
      </section>
    </>
  );
}
