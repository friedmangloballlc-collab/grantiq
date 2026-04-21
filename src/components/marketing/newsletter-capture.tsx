"use client";

// Weekly grant roundup newsletter capture. Lives above the footer on
// the home page and in the bottom of /resources. Matches the existing
// find-my-funders input/button pattern so the two forms read as part
// of the same design system.
//
// Data: POSTs to /api/newsletter/subscribe → newsletter_subscribers.
// Double opt-in happens via email confirmation link (send wiring
// lands when the list clears ~50 subs — capture now, send later).

import { useState } from "react";
import { ArrowUpRight, Mail, Check, Loader2, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsletterCaptureProps {
  source?: string;
  // Optional eyebrow override — defaults to "Free weekly roundup"
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
}

export function NewsletterCapture({
  source = "home_newsletter",
  eyebrow = "Free · Every Monday morning",
  headline = "3 fresh grants in your inbox every week.",
  subheadline = "Real funding opportunities, filtered by sector and deadline. No fluff, no ads, one click to unsubscribe.",
}: NewsletterCaptureProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Subscription failed");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="py-20 px-4 bg-warm-50 dark:bg-warm-900/40 border-y border-warm-200 dark:border-warm-800"
    >
      <div className="max-w-5xl mx-auto grid md:grid-cols-[1.1fr_1fr] gap-10 md:gap-16 items-center">
        {/* Left: value prop */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 px-3 py-1">
            <Inbox className="h-3.5 w-3.5 text-brand-teal-text" aria-hidden="true" />
            <p className="text-xs font-semibold text-brand-teal-text tracking-[0.12em] uppercase">
              {eyebrow}
            </p>
          </div>
          <h2
            id="newsletter-heading"
            className="mt-4 text-3xl md:text-4xl font-bold tracking-[-0.02em] text-warm-900 dark:text-warm-50 leading-[1.1]"
          >
            {headline}
          </h2>
          <p className="mt-4 text-warm-600 dark:text-warm-400 leading-relaxed">
            {subheadline}
          </p>
          <p className="mt-6 text-xs text-warm-500 dark:text-warm-500">
            Join nonprofit leaders who read it over coffee. We never share
            your email. Unsubscribe any time.
          </p>
        </div>

        {/* Right: form */}
        <div>
          {status === "success" ? (
            <div className="rounded-2xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-8 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <Check
                  className="h-6 w-6 text-green-700 dark:text-green-400"
                  aria-hidden="true"
                />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-warm-900 dark:text-warm-50">
                Check your inbox.
              </h3>
              <p className="mt-2 text-sm text-warm-600 dark:text-warm-400">
                We sent a confirmation link to{" "}
                <span className="font-semibold text-warm-900 dark:text-warm-50">
                  {email}
                </span>
                . Click it to start receiving the Monday roundup.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-6 shadow-sm"
            >
              <label htmlFor="newsletter-email" className="block">
                <span className="text-sm font-semibold text-warm-900 dark:text-warm-50">
                  Your work email
                </span>
                <div className="relative mt-2">
                  <Mail
                    aria-hidden="true"
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-400"
                  />
                  <input
                    id="newsletter-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@yourorg.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === "submitting"}
                    className="w-full pl-10 pr-4 h-12 rounded-xl border border-warm-300 dark:border-warm-700 bg-white dark:bg-warm-900 text-sm text-warm-900 dark:text-warm-50 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal"
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={status === "submitting" || !email.trim()}
                className={cn(
                  "mt-3 w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-warm-900 text-white hover:bg-warm-800 dark:bg-warm-50 dark:text-warm-900 dark:hover:bg-warm-100 font-semibold text-sm transition-colors group/cta disabled:opacity-60 disabled:cursor-not-allowed"
                )}
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subscribing…
                  </>
                ) : (
                  <>
                    Get the Monday roundup
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
                  </>
                )}
              </button>
              {status === "error" && (
                <p
                  role="alert"
                  className="mt-3 text-xs text-red-600 dark:text-red-400 text-center"
                >
                  {errorMessage}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
