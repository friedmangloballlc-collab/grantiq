import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export function Hero() {
  return (
    <section className="relative py-20 md:py-32 px-4 overflow-hidden">
      {/* Soft radial glow — warm teal tint, provides depth without leaving
          the light aesthetic. Sits behind content, pointer-events disabled.
          Reference: Aixora hero glow, translated to our palette. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[1100px] max-w-full rounded-full blur-3xl opacity-40 bg-[radial-gradient(closest-side,theme(colors.brand-teal/25),transparent_70%)]" />
        <div className="absolute left-1/2 top-[200px] -translate-x-1/2 h-[500px] w-[800px] max-w-full rounded-full blur-3xl opacity-30 bg-[radial-gradient(closest-side,theme(colors.amber-200/40),transparent_70%)] dark:bg-[radial-gradient(closest-side,theme(colors.amber-900/20),transparent_70%)]" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-teal-dark text-white text-xs font-semibold tracking-wide mb-6">
          <Image
            src="/grantaq-icon.svg"
            alt=""
            width={16}
            height={16}
            className="h-4 w-4 brightness-0 invert"
          />
          AI-POWERED GRANT DISCOVERY &amp; READINESS
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-warm-900 dark:text-warm-50 leading-[1.05] tracking-tight">
          Find grants you actually
          <span className="text-brand-teal"> qualify for</span>
        </h1>
        <p className="text-lg md:text-xl text-warm-600 dark:text-warm-400 mt-6 max-w-2xl mx-auto leading-relaxed">
          Check your eligibility in 60 seconds. Our AI matches your organization
          to 6,000+ grants, diagnoses your readiness, and helps write winning
          applications.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
          <Button
            size="lg"
            className="bg-brand-teal hover:bg-brand-teal-dark text-white !h-14 !px-8 !py-4 text-base font-semibold shadow-sm gap-2"
            render={
              <Link href="/check">
                Check My Eligibility — Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <Button
            size="lg"
            variant="outline"
            className="!h-14 !px-8 !py-4 text-base font-medium"
            render={<Link href="/signup">Create Free Account</Link>}
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-warm-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal" /> No account
            needed
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal" /> Results in 60
            seconds
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal" /> 6,000+ grants
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal" /> 100% free
          </span>
        </div>
      </div>
    </section>
  );
}
