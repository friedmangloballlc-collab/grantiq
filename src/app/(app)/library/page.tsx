import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Lock, BookOpen } from "lucide-react";
import { LibraryClient } from "@/components/library/library-client";

export default async function LibraryPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const db = createAdminClient();

  const { data: membership } = await db
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership) return null;

  const { data: sub } = await db
    .from("subscriptions")
    .select("tier, trial_ends_at")
    .eq("org_id", membership.org_id)
    .single();

  const tier = sub?.tier ?? "free";
  const trialActive = sub?.trial_ends_at ? new Date(sub.trial_ends_at) > new Date() : false;
  const hasAccess = tier !== "free" || trialActive;

  if (!hasAccess) {
    return (
      <div className="max-w-6xl px-4 md:px-6 py-6 space-y-6">
        <div className="flex items-start gap-3">
          <BookOpen className="h-6 w-6 text-brand-teal mt-0.5 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
              Grant Library
            </h1>
            <p className="text-sm text-warm-500 mt-0.5">
              Browse and search thousands of grants, loans, in-kind resources, and matching gift programs.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 border border-warm-200 dark:border-warm-800 rounded-xl bg-warm-50 dark:bg-warm-900/50">
          <Lock className="h-12 w-12 text-warm-300 dark:text-warm-600" />
          <h2 className="text-xl font-semibold text-warm-900 dark:text-warm-50">
            Upgrade to access the Grant Library
          </h2>
          <p className="text-sm text-warm-500 max-w-md">
            The full grant library with 4,000+ searchable grants, loans, and funding
            programs is available on Starter plans and above.
            Free accounts can view their AI-matched grants on the Grant Matches page.
          </p>
          <div className="flex gap-3 mt-2">
            <Link href="/upgrade">
              <Button className="bg-brand-teal hover:bg-brand-teal-dark text-white">
                Upgrade Now
              </Button>
            </Link>
            <Link href="/matches">
              <Button variant="outline">View Your Matches</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <LibraryClient tier={tier} />;
}
