import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateReferralCode } from "@/lib/referral";
import { ReferralStats } from "@/components/referral/referral-stats";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Referrals | GrantIQ",
};

export default async function ReferralsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let code = "";
  let totalReferrals = 0;
  let signedUp = 0;
  let creditsEarned = 0;

  if (user) {
    // Check for existing referral code or create one
    const { data: existing } = await supabase
      .from("referral_codes")
      .select("code, referral_count, converted_count, credits_earned")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      code = existing.code;
      totalReferrals = existing.referral_count ?? 0;
      signedUp = existing.converted_count ?? 0;
      creditsEarned = existing.credits_earned ?? 0;
    } else {
      // Auto-generate on first visit
      const newCode = generateReferralCode();
      const { data: created } = await supabase
        .from("referral_codes")
        .insert({ user_id: user.id, code: newCode })
        .select("code")
        .single();
      code = created?.code ?? newCode;
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Referral Program
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          Invite others to GrantIQ and earn $50 in AI writing credits for each person who signs up.
        </p>
      </div>

      {code ? (
        <ReferralStats
          code={code}
          totalReferrals={totalReferrals}
          signedUp={signedUp}
          creditsEarned={creditsEarned}
        />
      ) : (
        <p className="text-sm text-warm-500">Sign in to access your referral link.</p>
      )}
    </div>
  );
}
