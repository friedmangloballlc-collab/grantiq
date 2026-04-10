"use client";

import { useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const QUESTIONS = [
  { q: "Does your organization have an EIN (Employer Identification Number)?", weight: 15 },
  { q: "Do you have a clearly written mission statement?", weight: 12 },
  { q: "Is your organization registered with your state as a legal entity?", weight: 10 },
  { q: "Do you have a board of directors or advisory board?", weight: 8 },
  { q: "Do you have an annual operating budget documented?", weight: 10 },
  { q: "Have you received any grants or funding in the past?", weight: 8 },
  { q: "Do you track your programs, outcomes, or impact data?", weight: 10 },
  { q: "Do you have a DUNS number or SAM.gov registration?", weight: 7 },
  { q: "Is your organization's financial information audited or reviewed annually?", weight: 10 },
  { q: "Do you have at least one dedicated person for grant writing or fundraising?", weight: 10 },
];

function getResult(score: number) {
  if (score >= 80)
    return {
      label: "Grant Ready",
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
      message:
        "Your organization has strong fundamentals for grant applications. You're well-positioned to apply for federal, state, and foundation grants. Start matching with grants on GrantAQ to find your best opportunities.",
    };
  if (score >= 50)
    return {
      label: "Almost Ready",
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
      message:
        "You have a solid foundation but a few gaps that could limit your competitiveness. Addressing the items you answered 'No' to will significantly improve your success rate. GrantAQ can help you identify and close these gaps.",
    };
  return {
    label: "Needs Preparation",
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    message:
      "Your organization needs some foundational work before pursuing most grants. The good news: these are fixable. GrantAQ's readiness tools and Grantie AI can guide you step-by-step to get grant-ready.",
  };
}

export default function ReadinessQuizPage() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === QUESTIONS.length;

  const score = QUESTIONS.reduce((sum, q, i) => sum + (answers[i] ? q.weight : 0), 0);
  const result = getResult(score);

  function reset() {
    setAnswers({});
    setSubmitted(false);
  }

  return (
    <div className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-brand-teal/10 text-brand-teal mb-4">
            Free Tool
          </span>
          <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50">
            Grant Readiness Quiz
          </h1>
          <p className="text-warm-500 mt-2">
            Answer 10 questions to find out if your organization is ready to apply for grants.
          </p>
        </div>

        {!submitted ? (
          <>
            <div className="space-y-4">
              {QUESTIONS.map((q, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-xl border border-warm-200 dark:border-warm-700"
                >
                  <span className="text-xs font-bold text-warm-400 mt-1 w-6 shrink-0">
                    {i + 1}.
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-warm-900 dark:text-warm-50 mb-3">
                      {q.q}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setAnswers({ ...answers, [i]: true })}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          answers[i] === true
                            ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400"
                            : "border-warm-200 text-warm-500 hover:border-green-300 dark:border-warm-700"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setAnswers({ ...answers, [i]: false })}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          answers[i] === false
                            ? "bg-red-50 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400"
                            : "border-warm-200 text-warm-500 hover:border-red-300 dark:border-warm-700"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-warm-400 mb-3">
                {answeredCount} of {QUESTIONS.length} answered
              </p>
              <Button
                disabled={!allAnswered}
                onClick={() => setSubmitted(true)}
                className="bg-brand-teal hover:bg-brand-teal-dark text-white px-8"
              >
                See My Results
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            {/* Score display */}
            <div className="text-center">
              <p className="text-6xl font-extrabold text-warm-900 dark:text-warm-50">
                {score}
                <span className="text-2xl text-warm-400">/100</span>
              </p>
              <p className={`text-xl font-bold mt-2 ${result.color}`}>{result.label}</p>
            </div>

            <div className={`rounded-xl border p-5 ${result.bg} dark:bg-warm-800/50 dark:border-warm-700`}>
              <p className="text-sm leading-relaxed text-warm-700 dark:text-warm-300">
                {result.message}
              </p>
            </div>

            {/* Show what they're missing */}
            {QUESTIONS.some((_, i) => answers[i] === false) && (
              <div className="rounded-xl border border-warm-200 dark:border-warm-700 p-5">
                <h3 className="text-sm font-semibold text-warm-900 dark:text-warm-50 mb-3">
                  Areas to Improve
                </h3>
                <ul className="space-y-2">
                  {QUESTIONS.filter((_, i) => answers[i] === false).map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-warm-600 dark:text-warm-400">
                      <span className="text-red-400 mt-0.5">✕</span>
                      {q.q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                className="bg-brand-teal hover:bg-brand-teal-dark text-white"
                render={
                  <Link href="/signup">
                    Get Your Full Readiness Score <ArrowRight className="ml-2 h-4 w-4 inline" />
                  </Link>
                }
              />
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake Quiz
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
