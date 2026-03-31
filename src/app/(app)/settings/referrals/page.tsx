import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateReferralCode } from "@/lib/referral";
import { ReferralDashboard } from "@/components/referral/referral-dashboard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Referrals | GrantAQ",
};

export default async function ReferralsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let code = "";
  let totalReferrals = 0;
  let signedUp = 0;
  let active = 0;
  let creditsEarned = 0;

  if (user) {
    // Get user's org membership
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    const orgId = membership?.org_id;

    // Check for existing referral code
    const { data: existing } = await supabase
      .from("referrals")
      .select("code, status, credit_amount_cents")
      .eq("referrer_user_id", user.id)
      .order("created_at", { ascending: false });

    if (existing && existing.length > 0) {
      code = existing[0].code;
      totalReferrals = existing.length;
      signedUp = existing.filter(
        (r) => r.status === "signed_up" || r.status === "converted" || r.status === "credit_applied"
      ).length;
      active = existing.filter((r) => r.status === "converted").length;
      creditsEarned =
        existing
          .filter((r) => r.status === "credit_applied")
          .reduce((sum, r) => sum + (r.credit_amount_cents ?? 0), 0) / 100;
    } else if (orgId) {
      // Auto-generate on first visit using admin client (RLS may block insert)
      const admin = createAdminClient();
      const newCode = generateReferralCode();
      await admin.from("referrals").insert({
        referrer_user_id: user.id,
        referrer_org_id: orgId,
        code: newCode,
        status: "pending",
      });
      code = newCode;
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Referral Program 2.0
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          Earn bigger rewards the more you share. Your referrals get a 14-day Strategist trial — free.
        </p>
      </div>

      {code ? (
        <ReferralDashboard
          code={code}
          totalReferrals={totalReferrals}
          signedUp={signedUp}
          active={active}
          creditsEarned={creditsEarned}
        />
      ) : (
        <p className="text-sm text-warm-500">Sign in to access your referral link.</p>
      )}
    </div>
  );
}
