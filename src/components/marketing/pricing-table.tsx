import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Explorer",
    price: "$0",
    period: "forever",
    features: [
      "1 match run/month (top 5)",
      "Federal grants only",
      "1 readiness score",
      "3 pipeline items",
      "5 Grantie chats/day",
    ],
    cta: "Start Free",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Seeker",
    price: "$49",
    period: "/month",
    features: [
      "Full grant library",
      "10 pipeline items",
      "Calendar & workback schedule",
      "5 document uploads",
      "15 Grantie chats/day",
    ],
    cta: "Get Started",
    href: "/signup?plan=starter",
    highlighted: false,
  },
  {
    name: "Strategist",
    price: "$99",
    period: "/month",
    features: [
      "Unlimited scorecard evaluations",
      "Document vault",
      "30 Grantie chats/day",
      "A-Z Readiness tracking",
      "Full analytics",
    ],
    cta: "Get Started",
    href: "/signup?plan=pro",
    highlighted: true,
  },
  {
    name: "Applicant",
    price: "$199",
    period: "/month",
    features: [
      "AI writing + compliance",
      "Unlimited pipeline",
      "Budget narratives",
      "Full Confidence eligible",
      "Priority support",
    ],
    cta: "Get Started",
    href: "/signup?plan=growth",
    highlighted: false,
  },
  {
    name: "Organization",
    price: "$399",
    period: "/month",
    features: [
      "Everything in Applicant",
      "Unlimited team members",
      "5 AI drafts/month",
      "API access",
      "Dedicated CSM",
    ],
    cta: "Contact Sales",
    href: "/signup?plan=enterprise",
    highlighted: false,
  },
];

export function PricingTable() {
  return (
    <section className="py-20 px-4" id="pricing">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-warm-900 dark:text-warm-50">
          Simple, Transparent Pricing
        </h2>
        <p className="text-center text-warm-500 mt-2">
          Pay only when you win with our success fee model. No risk.
        </p>
        <div className="grid md:grid-cols-5 gap-5 mt-12">
          {TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={cn(
                "border-warm-200 dark:border-warm-800 relative",
                tier.highlighted && "border-brand-teal ring-2 ring-brand-teal/20"
              )}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-teal text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-warm-900 dark:text-warm-50">{tier.price}</span>
                  <span className="text-warm-500 text-sm">{tier.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-warm-600 dark:text-warm-400">
                      <Check className="h-4 w-4 text-brand-teal shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    "w-full",
                    tier.highlighted ? "bg-brand-teal hover:bg-brand-teal-dark text-white" : ""
                  )}
                  variant={tier.highlighted ? "default" : "outline"}
                  render={<Link href={tier.href}>{tier.cta}</Link>}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
