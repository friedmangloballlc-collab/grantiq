import { Hero } from "@/components/marketing/hero";
import { GrantMarquee } from "@/components/marketing/grant-marquee";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { CapabilitiesAccordion } from "@/components/marketing/capabilities-accordion";
import { ProductPreview } from "@/components/marketing/product-preview";
import { HowWeWork } from "@/components/marketing/how-we-work";
import { GrantServices } from "@/components/marketing/grant-services";
import { PricingTable } from "@/components/marketing/pricing-table";
import { FAQ } from "@/components/marketing/faq";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "GrantAQ — AI-Powered Grant Discovery, Strategy & Writing",
  description:
    "Find grants you actually qualify for. AI matches your organization to 5,000+ funding sources, builds your strategy, and helps write winning applications.",
  alternates: {
    canonical: "https://grantaq.com",
  },
  openGraph: {
    title: "GrantAQ — Find Grants You Actually Qualify For",
    description: "AI-powered grant discovery, strategy, and writing for nonprofits and small businesses.",
    url: "https://grantaq.com",
    siteName: "GrantAQ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GrantAQ — AI-Powered Grant Discovery",
    description: "Find grants you actually qualify for. AI does the heavy lifting.",
  },
};

function formatGrantCount(count: number | null): string {
  if (!count) return "5,000+";
  // Round down to nearest hundred and append "+"
  const rounded = Math.floor(count / 100) * 100;
  return `${rounded.toLocaleString()}+`;
}

export default async function LandingPage() {
  const admin = createAdminClient();
  const { count: grantCount } = await admin
    .from("grant_sources")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  return (
    <>
      <Hero />

      {/* Live grant marquee — proves data freshness in two seconds */}
      <GrantMarquee />

      {/* Stats block — cards with real numbers. Inspired by Aixora's
          metric block structure, translated to our warm/light palette. */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-brand-teal-text tracking-[0.2em] uppercase">
              By the numbers
            </p>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight text-warm-900 dark:text-warm-50">
              Real data, verified nightly
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-6 text-center">
              <p className="text-4xl md:text-5xl font-bold text-brand-teal-text tabular-nums tracking-tight">
                {formatGrantCount(grantCount)}
              </p>
              <p className="text-sm font-medium text-warm-900 dark:text-warm-50 mt-3">
                Active grants
              </p>
              <p className="text-xs text-warm-500 mt-1">
                federal, state, foundation & corporate
              </p>
            </div>
            <div className="rounded-2xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-6 text-center">
              <p className="text-4xl md:text-5xl font-bold text-brand-teal-text tracking-tight">
                Nightly
              </p>
              <p className="text-sm font-medium text-warm-900 dark:text-warm-50 mt-3">
                Verification cycle
              </p>
              <p className="text-xs text-warm-500 mt-1">
                dead links and past deadlines pulled automatically
              </p>
            </div>
            <div className="rounded-2xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-6 text-center">
              <p className="text-4xl md:text-5xl font-bold text-brand-teal-text tabular-nums tracking-tight">
                60<span className="text-2xl md:text-3xl font-semibold ml-0.5">sec</span>
              </p>
              <p className="text-sm font-medium text-warm-900 dark:text-warm-50 mt-3">
                Eligibility check
              </p>
              <p className="text-xs text-warm-500 mt-1">
                no signup, no credit card
              </p>
            </div>
          </div>
        </div>
      </section>

      <HowItWorks />
      <CapabilitiesAccordion />
      <ProductPreview />
      <HowWeWork />
      <GrantServices />

      {/* Free Tools CTA */}
      <section className="py-16 px-4 bg-brand-teal/5 dark:bg-brand-teal/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-warm-900 dark:text-warm-50 mb-3">
            Try Our Free Grant Tools
          </h2>
          <p className="text-warm-500 mb-8 max-w-xl mx-auto">
            No account needed. Check your grant readiness, estimate your funding gap, and explore grants by state — all for free.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              className="bg-brand-teal hover:bg-brand-teal-dark text-white"
              render={<Link href="/tools/readiness-quiz">Take the Readiness Quiz</Link>}
            />
            <Button variant="outline" render={<Link href="/tools/funding-gap">Funding Gap Calculator</Link>} />
            <Button variant="outline" render={<Link href="/tools">See All Free Tools</Link>} />
          </div>
        </div>
      </section>

      {/* Start a Nonprofit Section */}
      <section id="start-nonprofit" className="py-20 px-4 bg-white dark:bg-warm-900 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-brand-teal/10 text-brand-teal mb-4">
              Nonprofit Services
            </span>
            <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50">
              Start or Register Your Nonprofit
            </h2>
            <p className="text-warm-500 mt-3 max-w-2xl mx-auto">
              Whether you&apos;re launching a new mission or formalizing your organization, we&apos;ll guide you through every step.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Start a Nonprofit */}
            <div className="rounded-2xl border border-warm-200 dark:border-warm-700 p-8 hover:border-brand-teal/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-brand-teal/10 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-warm-900 dark:text-warm-50 mb-2">
                Start a Nonprofit
              </h3>
              <p className="text-warm-500 text-sm leading-relaxed mb-4">
                Turn your mission into a legally recognized nonprofit organization. We&apos;ll help you understand the requirements, prepare your documents, and navigate the formation process.
              </p>
              <ul className="space-y-2 text-sm text-warm-600 dark:text-warm-400 mb-6">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Determine the right nonprofit structure
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Draft articles of incorporation &amp; bylaws
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Apply for your EIN &amp; state registration
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Get matched with startup grants immediately
                </li>
              </ul>
              <Button
                className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white"
                render={<Link href="/signup/nonprofit">Start Your Nonprofit</Link>}
              />
            </div>

            {/* Register as 501(c)(3) */}
            <div id="get-certified" className="rounded-2xl border border-warm-200 dark:border-warm-700 p-8 hover:border-brand-teal/50 transition-colors scroll-mt-16">
              <div className="w-12 h-12 rounded-xl bg-brand-teal/10 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-warm-900 dark:text-warm-50 mb-2">
                Get Your 501(c)(3) Status
              </h3>
              <p className="text-warm-500 text-sm leading-relaxed mb-4">
                Already operating but need tax-exempt status? We&apos;ll help you prepare and file your IRS Form 1023 or 1023-EZ to become a registered 501(c)(3) nonprofit.
              </p>
              <ul className="space-y-2 text-sm text-warm-600 dark:text-warm-400 mb-6">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Eligibility assessment for 501(c)(3)
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  IRS Form 1023 / 1023-EZ preparation
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  State charitable registration guidance
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Unlock foundation &amp; federal grant eligibility
                </li>
              </ul>
              <Button
                className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white"
                render={<Link href="/signup">Register Your Nonprofit</Link>}
              />
            </div>
          </div>
        </div>
      </section>

      <PricingTable />
      <FAQ />

      {/* Bottom CTA */}
      <section className="py-24 px-4 text-center bg-warm-50 dark:bg-warm-800/30">
        <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.02em] text-warm-900 dark:text-warm-50 leading-[1.05]">
          Ready to find grants
          <br className="hidden sm:inline" /> you&apos;re missing?
        </h2>
        <p className="text-warm-600 dark:text-warm-400 mt-5 max-w-xl mx-auto">
          Start with a free readiness score. Upgrade when you&apos;re writing
          applications, not before.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
          <Button
            size="lg"
            className="!bg-warm-900 !text-white hover:!bg-warm-800 dark:!bg-warm-50 dark:!text-warm-900 dark:hover:!bg-warm-100 !h-14 !px-8 !py-4 text-base font-semibold rounded-full gap-2 group/cta"
            render={
              <Link href="/signup">
                Get Started Free
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
              </Link>
            }
          />
          <Button
            size="lg"
            variant="outline"
            className="!h-14 !px-8 !py-4 text-base font-medium rounded-full border-warm-300 dark:border-warm-700"
            render={<Link href="/check">Check Your Eligibility</Link>}
          />
        </div>
      </section>
    </>
  );
}
