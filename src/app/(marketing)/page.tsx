import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GrantIQ — AI-Powered Grant Discovery, Strategy & Writing",
  description:
    "Find grants you actually qualify for. AI matches your organization to 5,000+ funding sources, builds your strategy, and helps write winning applications.",
};

export default function LandingPage() {
  return (
    <>
      <Hero />

      {/* Stats bar */}
      <section className="py-10 px-4 bg-brand-teal/5 dark:bg-brand-teal/10 border-y border-brand-teal/10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "5,000+", label: "Active Grants" },
            { value: "$2.4B+", label: "Tracked Funding" },
            { value: "94%", label: "Match Accuracy" },
            { value: "3 min", label: "Avg. Onboarding" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold text-brand-teal">{stat.value}</p>
              <p className="text-sm text-warm-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <HowItWorks />

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

      {/* Bottom CTA */}
      <section className="py-24 px-4 text-center bg-warm-50 dark:bg-warm-800/30">
        <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50">
          Ready to find grants you&apos;re missing?
        </h2>
        <p className="text-warm-500 mt-2 max-w-xl mx-auto">
          Join organizations already using GrantIQ to discover funding, build strategy, and write winning applications faster.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Button
            size="lg"
            className="bg-brand-teal hover:bg-brand-teal-dark text-white px-8"
            render={
              <Link href="/signup">
                Get Started Free <ArrowRight className="ml-2 h-4 w-4 inline" />
              </Link>
            }
          />
          <Button
            size="lg"
            variant="outline"
            render={<Link href="/grant-directory">Browse Grant Directory</Link>}
          />
        </div>
      </section>
    </>
  );
}
