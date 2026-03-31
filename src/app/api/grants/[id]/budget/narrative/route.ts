// grantaq/src/app/api/grants/[id]/budget/narrative/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateBudgetNarrative } from "@/lib/ai/writing/budget-narrative";
import type { BudgetLineItem } from "@/components/budget/budget-builder";
import type { BudgetNarrativeContext } from "@/lib/ai/writing/budget-narrative";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: grantId } = await params;
    const body = (await req.json()) as {
      lineItems: BudgetLineItem[];
      context: BudgetNarrativeContext;
    };

    const { lineItems, context } = body;

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: "lineItems array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Validate grant exists
    const { data: grant } = await supabase
      .from("grant_sources")
      .select("id")
      .eq("id", grantId)
      .single();

    if (!grant) {
      return NextResponse.json({ error: "Grant not found" }, { status: 404 });
    }

    const result = await generateBudgetNarrative(lineItems, context);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[budget/narrative] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
