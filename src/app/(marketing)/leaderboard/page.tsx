import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Funding Leaderboard | GrantAQ",
  description:
    "See how much grant funding GrantAQ users have secured across all 50 states.",
};

export const revalidate = 3600;

export default async function LeaderboardPage() {
  const supabase = createAdminClient();

  const { data: outcomes } = await supabase
    .from("grant_outcomes")
    .select("amount_awarded")
    .eq("outcome", "awarded");

  const totalFunding = (outcomes ?? []).reduce(
    (sum, o) => sum + (o.amount_awarded ?? 0),
    0
  );
  const totalWins = outcomes?.length ?? 0;

  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50">
          Funding Leaderboard
        </h1>
        <p className="text-warm-500 mt-2">
          Real results from real organizations using GrantAQ.
        </p>
      </div>

      <Card className="border-brand-teal/30 bg-brand-teal/5 mb-8">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-warm-500">
            Total funding secured through GrantAQ
          </p>
          <p className="text-5xl font-bold text-brand-teal mt-2">
            {totalFunding >= 1_000_000
              ? `$${(totalFunding / 1_000_000).toFixed(1)}M`
              : `$${(totalFunding / 1_000).toFixed(0)}K`}
          </p>
          <p className="text-warm-500 mt-2">{totalWins} grants won</p>
        </CardContent>
      </Card>

      <div className="text-center mt-8">
        <p className="text-warm-500">Want to be on this leaderboard?</p>
        <Button
          className="mt-3 bg-brand-teal hover:bg-brand-teal-dark text-white"
          render={<Link href="/signup">Start Finding Grants — Free</Link>}
        />
      </div>
    </div>
  );
}
