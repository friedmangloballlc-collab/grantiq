"use client";

import { useState } from "react";
import { Clock, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const GRANT_SIZES = [
  { value: "small", label: "Small ($5K — $25K)", weeks: 4, prep: 1, review: 4 },
  { value: "medium", label: "Medium ($25K — $100K)", weeks: 8, prep: 2, review: 8 },
  { value: "large", label: "Large ($100K — $500K)", weeks: 14, prep: 3, review: 12 },
  { value: "major", label: "Major ($500K+)", weeks: 20, prep: 4, review: 16 },
];

const GRANT_SOURCES = [
  { value: "foundation", label: "Foundation / Private", addWeeks: 0, reviewNote: "Rolling or quarterly review cycles" },
  { value: "state", label: "State / Local Government", addWeeks: 2, reviewNote: "Typically 60-90 day review periods" },
  { value: "federal", label: "Federal (Grants.gov)", addWeeks: 4, reviewNote: "90-180 day review cycles; multi-stage review common" },
  { value: "corporate", label: "Corporate / CSR", addWeeks: -1, reviewNote: "Faster turnaround; some respond in 30 days" },
];

const EXPERIENCE_LEVELS = [
  { value: "first", label: "First-time applicant", addWeeks: 3 },
  { value: "some", label: "Applied 1-5 times", addWeeks: 1 },
  { value: "experienced", label: "Experienced (6+ apps)", addWeeks: 0 },
];

interface TimelineStep {
  phase: string;
  weeks: number;
  tasks: string[];
}

function buildTimeline(size: typeof GRANT_SIZES[0], source: typeof GRANT_SOURCES[0], exp: typeof EXPERIENCE_LEVELS[0]): TimelineStep[] {
  const prepWeeks = size.prep + exp.addWeeks;
  const writeWeeks = size.weeks + source.addWeeks;
  const reviewWeeks = Math.max(2, size.review);

  return [
    {
      phase: "Pre-Application Prep",
      weeks: prepWeeks,
      tasks: [
        "Register on SAM.gov (if federal)",
        "Gather organizational documents (EIN, bylaws, financials)",
        "Draft or update your mission statement & program descriptions",
        "Identify 2-3 letters of support contacts",
        exp.value === "first" ? "Research funder priorities and past awardees" : "Review funder's updated priorities",
      ],
    },
    {
      phase: "Writing & Assembly",
      weeks: writeWeeks,
      tasks: [
        "Draft the narrative (needs statement, project description, evaluation plan)",
        "Build the budget with narrative justification",
        "Collect letters of support and MOUs",
        "Complete all required forms and certifications",
        "Internal review and revision cycle (plan for 2-3 drafts)",
        "Final proofread and compliance check",
      ],
    },
    {
      phase: "Submission & Follow-up",
      weeks: 1,
      tasks: [
        "Submit application before deadline (aim for 48 hours early)",
        "Confirm receipt and save confirmation number",
        "Log the submission in your grant tracker",
        "Set a calendar reminder for the expected decision date",
      ],
    },
    {
      phase: "Review Period (Waiting)",
      weeks: reviewWeeks,
      tasks: [
        source.reviewNote,
        "Be prepared to respond to clarifying questions",
        "Continue pursuing other grants during this time",
        "If awarded: prepare for grant agreement & reporting requirements",
      ],
    },
  ];
}

export default function GrantTimelinePage() {
  const [size, setSize] = useState("");
  const [source, setSource] = useState("");
  const [experience, setExperience] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const sizeObj = GRANT_SIZES.find((s) => s.value === size);
  const sourceObj = GRANT_SOURCES.find((s) => s.value === source);
  const expObj = EXPERIENCE_LEVELS.find((e) => e.value === experience);

  const canSubmit = size && source && experience;
  const timeline = sizeObj && sourceObj && expObj ? buildTimeline(sizeObj, sourceObj, expObj) : [];
  const totalWeeks = timeline.reduce((sum, step) => sum + step.weeks, 0);

  return (
    <div className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-brand-teal/10 text-brand-teal mb-4">
            Free Tool
          </span>
          <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50">
            Grant Application Timeline
          </h1>
          <p className="text-warm-500 mt-2">
            See how long a grant application will take from start to decision — so you can plan backwards from the deadline.
          </p>
        </div>

        <div className="space-y-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-2">
              Grant size
            </label>
            <select
              value={size}
              onChange={(e) => { setSize(e.target.value); setSubmitted(false); }}
              className="w-full rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 px-4 py-3 text-sm text-warm-900 dark:text-warm-50"
            >
              <option value="">Select grant size...</option>
              {GRANT_SIZES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-2">
              Grant source
            </label>
            <select
              value={source}
              onChange={(e) => { setSource(e.target.value); setSubmitted(false); }}
              className="w-full rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 px-4 py-3 text-sm text-warm-900 dark:text-warm-50"
            >
              <option value="">Select grant source...</option>
              {GRANT_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-2">
              Your grant writing experience
            </label>
            <select
              value={experience}
              onChange={(e) => { setExperience(e.target.value); setSubmitted(false); }}
              className="w-full rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 px-4 py-3 text-sm text-warm-900 dark:text-warm-50"
            >
              <option value="">Select experience level...</option>
              {EXPERIENCE_LEVELS.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>
        </div>

        {canSubmit && !submitted && (
          <div className="text-center">
            <Button
              onClick={() => setSubmitted(true)}
              className="bg-brand-teal hover:bg-brand-teal-dark text-white px-8"
            >
              Build My Timeline
            </Button>
          </div>
        )}

        {submitted && timeline.length > 0 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <p className="text-5xl font-extrabold text-brand-teal">{totalWeeks}</p>
              <p className="text-sm text-warm-500">weeks total (start to decision)</p>
            </div>

            <div className="relative">
              {timeline.map((step, i) => (
                <div key={step.phase} className="relative pl-8 pb-8 last:pb-0">
                  {/* Timeline line */}
                  {i < timeline.length - 1 && (
                    <div className="absolute left-[13px] top-6 bottom-0 w-0.5 bg-warm-200 dark:bg-warm-700" />
                  )}
                  {/* Dot */}
                  <div className="absolute left-0 top-1 w-7 h-7 rounded-full bg-brand-teal/10 flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-brand-teal" />
                  </div>

                  <div className="rounded-xl border border-warm-200 dark:border-warm-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-warm-900 dark:text-warm-50">{step.phase}</h3>
                      <span className="text-xs font-medium text-brand-teal bg-brand-teal/10 px-2 py-0.5 rounded-full">
                        {step.weeks} week{step.weeks !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {step.tasks.map((task, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-warm-600 dark:text-warm-400">
                          <CheckCircle className="h-3 w-3 text-warm-300 mt-0.5 shrink-0" />
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center pt-4">
              <p className="text-sm text-warm-500 mb-4">
                GrantAQ automates the writing, compliance, and tracking steps — cutting weeks off your timeline.
              </p>
              <Button
                className="bg-brand-teal hover:bg-brand-teal-dark text-white"
                render={
                  <Link href="/signup">
                    Speed Up My Applications <ArrowRight className="ml-2 h-4 w-4 inline" />
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
