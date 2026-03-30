import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TodaysFocus } from "@/components/dashboard/todays-focus";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { WhatsChanged } from "@/components/dashboard/whats-changed";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  // TODO: Replace with real queries once data pipeline is active
  const stats = { totalMatches: 0, activePipeline: 0, totalPipelineValue: 0, winRate: 0 };
  const focusItems: Parameters<typeof TodaysFocus>[0]["items"] = [];
  const changeItems: Parameters<typeof WhatsChanged>[0]["items"] = [];

  // Suppress unused variable warning until real queries are wired up
  void supabase;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Dashboard</h1>
        <p className="text-sm text-warm-500 mt-1">Welcome back. Here&apos;s what needs your attention.</p>
      </div>
      <TodaysFocus items={focusItems} />
      <StatsOverview {...stats} />
      <WhatsChanged items={changeItems} />
    </div>
  );
}
