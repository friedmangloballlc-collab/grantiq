"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Globe,
  Search,
  Mail,
  Sparkles,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Three-step lead-capture modeled on Grantable's "Find My Funders" flow.
// Drops above the fold of the home page so visitors convert before
// reaching /signup. Submits to /api/leads/home-capture which upserts
// into the public leads table.

const STEPS = [
  {
    n: 1,
    title: "Tell us about your organization",
    body: "Drop your website — we read your mission, programs, and service area automatically.",
  },
  {
    n: 2,
    title: "Our AI does the research",
    body: "We score 6,000+ active grants against your profile. Federal, state, foundation, corporate — no category skipped.",
  },
  {
    n: 3,
    title: "Get your matches by email",
    body: "A ranked list of funders that actually fit your work — delivered to your inbox, plus a shareable report.",
  },
];

export function FindMyFunders() {
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/leads/home-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), website: website.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Submission failed");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <section
      aria-labelledby="find-funders-heading"
      className="py-20 px-4"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-brand-teal-text tracking-[0.2em] uppercase">
            Free · 60 seconds · No signup
          </p>
          <h2
            id="find-funders-heading"
            className="mt-3 text-4xl md:text-5xl font-bold tracking-[-0.02em] text-warm-900 dark:text-warm-50 leading-[1.05]"
          >
            Find funders that fit
            <br className="hidden sm:inline" /> your work.
          </h2>
          <p className="mt-5 text-warm-600 dark:text-warm-400 text-base md:text-lg leading-relaxed">
            Paste your website. We&apos;ll email you a ranked list of grants
            your org can actually win — with match scores, award ranges, and
            deadlines. No ads, no tracking, no credit card.
          </p>
        </div>

        {/* Form card */}
        <div className="max-w-3xl mx-auto rounded-3xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 shadow-sm overflow-hidden">
          {status === "success" ? (
            <div className="p-10 text-center">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 mb-5">
                <Check
                  className="h-7 w-7 text-green-700 dark:text-green-400"
                  aria-hidden="true"
                />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-warm-900 dark:text-warm-50">
                Check your inbox.
              </h3>
              <p className="mt-3 text-warm-600 dark:text-warm-400 max-w-md mx-auto">
                We&apos;ll have your first matches over to{" "}
                <span className="font-semibold text-warm-900 dark:text-warm-50">
                  {email}
                </span>{" "}
                shortly. While you wait, browse the live grant library.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="grid md:grid-cols-[1fr_auto] gap-3 p-6 md:p-8"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="relative block">
                  <span className="sr-only">Your website</span>
                  <Globe
                    aria-hidden="true"
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-400"
                  />
                  <input
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    placeholder="yourorg.org"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    disabled={status === "submitting"}
                    className="w-full pl-10 pr-4 h-12 rounded-xl border border-warm-300 dark:border-warm-700 bg-white dark:bg-warm-900 text-sm text-warm-900 dark:text-warm-50 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
                  />
                </label>
                <label className="relative block">
                  <span className="sr-only">Your email</span>
                  <Mail
                    aria-hidden="true"
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-400"
                  />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@yourorg.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === "submitting"}
                    className="w-full pl-10 pr-4 h-12 rounded-xl border border-warm-300 dark:border-warm-700 bg-white dark:bg-warm-900 text-sm text-warm-900 dark:text-warm-50 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={status === "submitting" || !email.trim()}
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-warm-900 text-white hover:bg-warm-800 dark:bg-warm-50 dark:text-warm-900 dark:hover:bg-warm-100 font-semibold text-sm transition-colors group/cta disabled:opacity-60 disabled:cursor-not-allowed"
                )}
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Working…
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Find My Funders
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
                  </>
                )}
              </button>
              <p className="md:col-span-2 text-center text-xs text-warm-500 mt-1">
                We&apos;ll email your personalized funder report —{" "}
                <span className="font-medium text-warm-700 dark:text-warm-300">
                  completely free, no signup required.
                </span>
              </p>
              {status === "error" && (
                <p
                  role="alert"
                  className="md:col-span-2 text-center text-xs text-red-600 dark:text-red-400"
                >
                  {errorMessage}
                </p>
              )}
            </form>
          )}
        </div>

        {/* 3-step explainer below form */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {STEPS.map((step) => (
            <div key={step.n} className="flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-warm-900 dark:bg-warm-50 text-white dark:text-warm-900 text-sm font-bold tabular-nums">
                  {step.n}
                </span>
                <div className="h-px flex-1 bg-warm-200 dark:bg-warm-800" />
                {step.n === 1 && (
                  <Globe
                    className="h-4 w-4 text-brand-teal"
                    aria-hidden="true"
                  />
                )}
                {step.n === 2 && (
                  <Sparkles
                    className="h-4 w-4 text-brand-teal"
                    aria-hidden="true"
                  />
                )}
                {step.n === 3 && (
                  <Mail
                    className="h-4 w-4 text-brand-teal"
                    aria-hidden="true"
                  />
                )}
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-warm-900 dark:text-warm-50">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-warm-600 dark:text-warm-400 leading-relaxed">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
