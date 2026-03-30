import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getIndustryProfile } from "@/lib/industry/pain-points";
import { Lightbulb, AlertCircle, ArrowRight, BadgeCheck } from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  readiness_audit: "Grant Readiness Audit",
  grant_strategy: "Grant Strategy Session",
  full_service: "Full-Service Grant Writing",
};

const GRANT_TYPE_LABELS: Record<string, string> = {
  federal: "Federal",
  state: "State",
  foundation: "Foundation",
  corporate: "Corporate",
};

const GRANT_TYPE_COLORS: Record<string, string> = {
  federal: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  state: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
  foundation: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  corporate: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
};

interface IndustryInsightsProps {
  industryKey: string | null;
}

export function IndustryInsights({ industryKey }: IndustryInsightsProps) {
  const profile = getIndustryProfile(industryKey);

  if (!profile) return null;

  const tierLabel = TIER_LABELS[profile.recommendedServiceTier] ?? profile.recommendedServiceTier;

  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-brand-teal" />
            Grant Insights for {profile.industry}
          </CardTitle>
          <div className="flex gap-1.5 flex-wrap">
            {profile.recommendedGrantTypes.map((type) => (
              <span
                key={type}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${GRANT_TYPE_COLORS[type] ?? "bg-warm-100 text-warm-700"}`}
              >
                {GRANT_TYPE_LABELS[type] ?? type}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pain Points */}
        <div>
          <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            Common Challenges in Your Industry
          </p>
          <ul className="space-y-1">
            {profile.painPoints.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-warm-700 dark:text-warm-300">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-teal shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Tips */}
        <div>
          <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <BadgeCheck className="h-3.5 w-3.5" />
            Industry Tips
          </p>
          <ul className="space-y-1">
            {profile.tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm text-warm-700 dark:text-warm-300">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-warm-100 dark:border-warm-800">
          <div>
            <p className="text-xs text-warm-500">Recommended service for your industry</p>
            <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">{tierLabel}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/grant-directory">
              <Button
                variant="outline"
                size="sm"
                className="border-warm-200 dark:border-warm-700 text-warm-700 dark:text-warm-300 hover:border-brand-teal hover:text-brand-teal"
              >
                Browse {profile.industry} Grants
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
