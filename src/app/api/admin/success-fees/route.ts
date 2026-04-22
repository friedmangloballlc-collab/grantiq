// POST /api/admin/success-fees       — log a new awarded grant
// PATCH /api/admin/success-fees/[id]  — mark funds received, invoiced, or paid
//
// Admin-only. This is the operational surface behind the /terms §5
// success fee policy. Until we wire customer self-reporting on the
// pipeline page, admins log awards manually here after learning
// about them (via customer email, public grant announcement, or
// periodic audit of customer pipelines).
//
// Keep the write path narrow: the amount, rate, and fee are all
// recorded at creation time. Future rate changes don't retroactively
// touch existing invoices — per /terms §5 "rate-lock at time of
// draft". We don't auto-derive fee from org tier on this route
// because the tier at draft time may differ from today's tier.

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";
import {
  computeSuccessFee,
  computeDueDate,
  SUCCESS_FEE_RATES,
  type FeeTier,
} from "@/lib/billing/success-fee";

interface CreateAwardBody {
  org_id: string;
  pipeline_id?: string | null;
  grant_name: string;
  funder_name?: string | null;
  amount_awarded: number;
  fee_tier: FeeTier;
  // Explicit override for bespoke rates (enterprise contracts, etc).
  // Required when fee_tier is 'custom'; ignored otherwise so admins
  // can't accidentally lower the rate for a subscription tier.
  fee_rate_override?: number;
  awarded_at?: string | null;
  funds_received_at?: string | null;
  notes?: string | null;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: CreateAwardBody;
  try {
    body = (await req.json()) as CreateAwardBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.org_id || !body.grant_name || !body.amount_awarded || !body.fee_tier) {
    return NextResponse.json(
      { error: "Required: org_id, grant_name, amount_awarded, fee_tier" },
      { status: 400 }
    );
  }

  let feeRatePercent: number;
  if (body.fee_tier === "custom") {
    if (typeof body.fee_rate_override !== "number" || body.fee_rate_override <= 0) {
      return NextResponse.json(
        { error: "fee_rate_override required when fee_tier is 'custom'" },
        { status: 400 }
      );
    }
    feeRatePercent = body.fee_rate_override;
  } else {
    feeRatePercent = SUCCESS_FEE_RATES[body.fee_tier];
  }

  const feeAmount = computeSuccessFee({
    amountAwarded: body.amount_awarded,
    feeRatePercent,
  });

  const fundsReceivedAt = body.funds_received_at
    ? new Date(body.funds_received_at)
    : null;
  const dueAt = computeDueDate(fundsReceivedAt);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("success_fee_invoices")
    .insert({
      org_id: body.org_id,
      pipeline_id: body.pipeline_id ?? null,
      grant_name: body.grant_name,
      funder_name: body.funder_name ?? null,
      amount_awarded: body.amount_awarded,
      fee_percentage: feeRatePercent,
      fee_amount: feeAmount,
      fee_tier: body.fee_tier,
      status: "pending",
      awarded_at: body.awarded_at ?? new Date().toISOString(),
      funds_received_at: fundsReceivedAt?.toISOString() ?? null,
      due_at: dueAt?.toISOString() ?? null,
      notes: body.notes ?? null,
      reported_by_admin: true,
    })
    .select("id")
    .single();

  if (error) {
    logger.error("success-fee insert failed", { err: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logger.info("success-fee logged", {
    id: data?.id,
    org_id: body.org_id,
    amount: body.amount_awarded,
    fee_amount: feeAmount,
    logged_by: user.email,
  });

  return NextResponse.json({ ok: true, id: data?.id, fee_amount: feeAmount });
}
