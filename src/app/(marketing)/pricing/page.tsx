import { PricingTable } from "@/components/marketing/pricing-table";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — GrantAQ",
  description:
    "Simple, transparent pricing for AI-powered grant discovery, strategy, and writing. Start free and upgrade as you grow.",
  alternates: {
    canonical: "https://grantaq.com/pricing",
  },
};

export default function PricingPage() {
  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold text-warm-900 dark:text-warm-50">
          Simple, Transparent Pricing
        </h1>
        <p className="text-warm-500 mt-3 max-w-xl mx-auto">
          Start free. Upgrade when you need more matching runs, AI writing, and
          team seats. No hidden fees.
        </p>
      </div>

      <PricingTable />

      <div className="max-w-4xl mx-auto text-center mt-16">
        <p className="text-sm text-warm-500">
          Have questions?{" "}
          <Link href="/#faq" className="text-brand-teal hover:underline font-medium">
            Check our FAQ
          </Link>
        </p>
      </div>
    </div>
  );
}
