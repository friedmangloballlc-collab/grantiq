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
            render={<Link href="/grants">Browse Grant Directory</Link>}
          />
        </div>
      </section>
    </>
  );
}
