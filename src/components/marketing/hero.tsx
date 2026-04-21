import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export function Hero() {
  return (
    <section className="relative py-24 md:py-36 px-4 overflow-hidden">
      {/* Soft radial glow — warm teal + amber, subtle depth behind headline. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[1100px] max-w-full rounded-full blur-3xl opacity-40 bg-[radial-gradient(closest-side,theme(colors.brand-teal/25),transparent_70%)]" />
        <div className="absolute left-1/2 top-[200px] -translate-x-1/2 h-[500px] w-[800px] max-w-full rounded-full blur-3xl opacity-30 bg-[radial-gradient(closest-side,theme(colors.amber-200/40),transparent_70%)] dark:bg-[radial-gradient(closest-side,theme(colors.amber-900/20),transparent_70%)]" />
      </div>

      <div className="max-w-5xl mx-auto text-center relative">
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

        {/* Editorial headline — bigger, tighter, more weight.
            Novatus-style typographic presence. */}
        <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold text-warm-900 dark:text-warm-50 leading-[0.95] tracking-[-0.02em]">
          Find grants you actually
          <br className="hidden sm:inline" />{" "}
          <span className="text-brand-teal">qualify for.</span>
        </h1>

        <p className="text-lg md:text-xl text-warm-600 dark:text-warm-400 mt-8 max-w-2xl mx-auto leading-relaxed">
          Check your eligibility in 60 seconds. Our AI matches your organization
          to 6,000+ grants, diagnoses your readiness, and helps write winning
          applications.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
          {/* Primary CTA — dark pill with arrow (Novatus trust-SaaS pattern) */}
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

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-warm-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal" /> No account
            needed
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal" /> Results in
            60 seconds
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal" /> 6,000+
            grants
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal" /> 100% free
          </span>
        </div>
      </div>
    </section>
  );
}
