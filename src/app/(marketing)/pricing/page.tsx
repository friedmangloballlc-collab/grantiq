import { PricingTable } from "@/components/marketing/pricing-table";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — GrantIQ",
  description:
    "Straightforward pricing for grant discovery, strategy, and AI-written applications. Start free. Upgrade when it saves you time.",
  alternates: {
    canonical: "https://grantaq.com/pricing",
  },
};

export default function PricingPage() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-3xl mx-auto text-center mb-4">
        <p className="text-xs font-semibold text-brand-teal tracking-[0.2em] uppercase">
          Pricing
        </p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-warm-900 dark:text-warm-50">
          Only pay when it saves you time.
        </h1>
        <p className="text-warm-600 dark:text-warm-400 mt-5 text-lg max-w-2xl mx-auto">
          Start on the free tier with real federal grants. Move up when you&apos;re
          writing more, collaborating with a team, or ready to let AI draft for
          you.
        </p>
      </div>

      <PricingTable />

      <div className="max-w-4xl mx-auto text-center mt-20">
        <p className="text-sm text-warm-500">
          Questions about which tier fits your org?{" "}
          <Link
            href="/#faq"
            className="text-brand-teal hover:underline font-medium"
          >
            See the FAQ
          </Link>
          {" · "}
          <a
            href="mailto:hello@grantaq.com"
            className="text-brand-teal hover:underline font-medium"
          >
            Talk to us
          </a>
        </p>
      </div>
    </div>
  );
}
