// grantaq/src/app/api/writing/purchase/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import Stripe from "stripe";
import { getWritingPrice, canPurchaseWriting } from "@/lib/ai/writing/pricing";
import { isAdminEmail } from "@/lib/auth/admin";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

const PurchaseSchema = z.object({
  org_id: z.string().uuid(),
  rfp_analysis_id: z.string().uuid(),
  tier: z.enum(["tier1_ai_only", "tier2_ai_audit", "tier3_expert"]),
  grant_type: z.enum(["state_foundation", "federal", "sbir_sttr"]),
  grant_source_id: z.string().uuid().optional(),
  pipeline_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = PurchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { org_id, rfp_analysis_id, tier, grant_type } = parsed.data;

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", org_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();
  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Check eligibility
  const { allowed, reason } = await canPurchaseWriting(org_id, tier, grant_type);
  if (!allowed) {
    return NextResponse.json({ error: reason }, { status: 403 });
  }

  // Admin bypass: skip Stripe entirely. Create the draft record with
  // a sentinel payment_intent_id and immediately mark it ready for the
  // worker. The frontend treats this exactly like a paid draft.
  if (isAdminEmail(user.email)) {
    const admin = createAdminClient();
    const { data: draft, error: draftError } = await admin
      .from("grant_drafts")
      .insert({
        org_id,
        user_id: user.id,
        rfp_analysis_id,
        grant_source_id: parsed.data.grant_source_id || null,
        pipeline_id: parsed.data.pipeline_id || null,
        tier,
        grant_type,
        status: "rfp_parsed",
        price_cents: 0,
        stripe_payment_intent_id: "admin_bypass",
        is_full_confidence: false,
      })
      .select("id")
      .single();

    if (draftError || !draft) {
      return NextResponse.json({ error: "Failed to create admin draft" }, { status: 500 });
    }

    // Skip the client_secret round-trip; tell the caller to immediately
    // POST /api/writing/start-draft.
    return NextResponse.json({
      draft_id: draft.id,
      client_secret: null,
      price_cents: 0,
      admin_bypass: true,
    });
  }

  const priceCents = getWritingPrice(tier, grant_type);

  // Get or create Stripe customer
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("org_id", org_id)
    .single();

  let customerId = subscription?.stripe_customer_id;
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: { org_id, user_id: user.id },
    });
    customerId = customer.id;
  }

  // Create payment intent
  const paymentIntent = await getStripe().paymentIntents.create({
    amount: priceCents,
    currency: "usd",
    customer: customerId,
    metadata: {
      type: "writing_purchase",
      org_id,
      rfp_analysis_id,
      tier,
      grant_type,
      user_id: user.id,
    },
    automatic_payment_methods: { enabled: true },
  });

  // Create draft record (pending payment confirmation via webhook)
  const { data: draft, error: draftError } = await supabase
    .from("grant_drafts")
    .insert({
      org_id,
      user_id: user.id,
      rfp_analysis_id,
      grant_source_id: parsed.data.grant_source_id || null,
      pipeline_id: parsed.data.pipeline_id || null,
      tier,
      grant_type,
      status: "rfp_parsed",
      price_cents: priceCents,
      stripe_payment_intent_id: paymentIntent.id,
      is_full_confidence: false,
    })
    .select("id")
    .single();

  if (draftError || !draft) {
    return NextResponse.json({ error: "Failed to create draft record" }, { status: 500 });
  }

  return NextResponse.json({
    draft_id: draft.id,
    client_secret: paymentIntent.client_secret,
    price_cents: priceCents,
  });
}
