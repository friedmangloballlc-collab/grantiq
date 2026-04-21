import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Sparkles } from "lucide-react";
import Image from "next/image";

export function Hero() {
  return (
    <section className="relative py-24 md:py-32 lg:py-36 px-4 overflow-hidden">
      {/* Soft radial glow — warm teal + amber */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[1100px] max-w-full rounded-full blur-3xl opacity-40 bg-[radial-gradient(closest-side,theme(colors.brand-teal/25),transparent_70%)]" />
        <div className="absolute left-1/2 top-[200px] -translate-x-1/2 h-[500px] w-[800px] max-w-full rounded-full blur-3xl opacity-30 bg-[radial-gradient(closest-side,theme(colors.amber-200/40),transparent_70%)] dark:bg-[radial-gradient(closest-side,theme(colors.amber-900/20),transparent_70%)]" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 lg:gap-14 items-center">
          {/* Left: headline + CTAs */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-teal-dark text-white text-xs font-semibold tracking-wide mb-8">
              <Image
                src="/grantaq-icon.svg"
                alt=""
                width={16}
                height={16}
                className="h-4 w-4 brightness-0 invert"
              />
              AI-POWERED GRANT DISCOVERY &amp; READINESS
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-[5.5rem] font-bold text-warm-900 dark:text-warm-50 leading-[0.95] tracking-[-0.02em]">
              Find grants you actually
              <br className="hidden sm:inline" />{" "}
              <span className="text-brand-teal">qualify for.</span>
            </h1>

            <p className="text-lg md:text-xl text-warm-600 dark:text-warm-400 mt-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Check your eligibility in 60 seconds. Our AI matches your
              organization to 6,000+ grants, diagnoses your readiness, and
              helps write winning applications.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mt-10">
              <Button
                size="lg"
                className="!bg-warm-900 !text-white hover:!bg-warm-800 dark:!bg-warm-50 dark:!text-warm-900 dark:hover:!bg-warm-100 !h-14 !px-8 !py-4 text-base font-semibold rounded-full gap-2 group/cta"
                render={
                  <Link href="/check">
                    Check My Eligibility — Free
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
                  </Link>
                }
              />
              <Button
                size="lg"
                variant="outline"
                className="!h-14 !px-8 !py-4 text-base font-medium rounded-full border-warm-300 dark:border-warm-700"
                render={<Link href="/signup">Create Free Account</Link>}
              />
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 mt-8 text-xs text-warm-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal" />
                No account needed
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal" />
                Results in 60 seconds
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal" />
                6,000+ grants
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal" />
                100% free
              </span>
            </div>
          </div>

          {/* Right: glass announcement card — Novatus pattern translated
              to our warm palette. Real product announcement, not a marketing
              placeholder. Backdrop-blur works over the radial glow underneath. */}
          <aside className="relative">
            <div className="relative rounded-3xl p-7 overflow-hidden border border-warm-200/60 dark:border-warm-800/60 bg-white/60 dark:bg-warm-900/60 backdrop-blur-xl shadow-sm">
              {/* Subtle teal tint on the card itself */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-br from-brand-teal/8 via-transparent to-amber-200/20 dark:from-brand-teal/12 dark:to-amber-900/10 -z-10"
              />
              <div className="flex items-center gap-2.5 mb-4">
                <span className="flex items-center justify-center h-7 w-7 rounded-full bg-brand-teal-dark text-white">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-teal-text">
                  New in GrantIQ
                </span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-warm-900 dark:text-warm-50 leading-snug">
                AI Grant Writing —
                <br />
                Tier 1 drafts in 30 minutes.
              </h2>
              <p className="mt-3 text-sm text-warm-600 dark:text-warm-400 leading-relaxed">
                Upload the RFP. AI drafts every section. Our auditor fact-checks
                every claim against your 990 before you see it. Scored against
                the funder&apos;s rubric. Starts at $249.
              </p>
              <Link
                href="/ai-grant-writing"
                className="inline-flex items-center gap-1.5 mt-5 px-5 py-2.5 rounded-full bg-warm-900 text-white hover:bg-warm-800 dark:bg-warm-50 dark:text-warm-900 dark:hover:bg-warm-100 font-semibold text-sm transition-colors group/link"
              >
                Explore AI Writing
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
