import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No active org membership" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("grant_pipeline")
      .select("*, grant_sources(name, funder_name, amount_max, deadline)")
      .eq("org_id", membership.org_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (err) {
    console.error("GET /api/pipeline error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No active org membership" }, { status: 403 });
    }

    const body = await req.json();
    const { grant_source_id, stage = "identified", notes } = body;

    if (!grant_source_id) {
      return NextResponse.json({ error: "grant_source_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("grant_pipeline")
      .insert({
        org_id: membership.org_id,
        grant_source_id,
        stage,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/pipeline error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const VALID_STAGES = [
  "identified",
  "qualified",
  "in_development",
  "under_review",
  "submitted",
  "pending_decision",
  "awarded",
  "declined",
] as const;

type PipelineStage = (typeof VALID_STAGES)[number];

// Auto-action metadata returned to the client so it can surface prompts
function getAutoAction(
  fromStage: string | null,
  toStage: PipelineStage
): { action: string; description: string } | null {
  if (fromStage === "identified" && toStage === "qualified") {
    return {
      action: "run_qualification_scorecard",
      description: "Run the Qualification Scorecard to confirm this grant is worth pursuing.",
    };
  }
  if (fromStage === "qualified" && toStage === "in_development") {
    return {
      action: "generate_application_checklist",
      description:
        "Auto-generating application checklist by cross-referencing grant requirements with your document vault.",
    };
  }
  if (fromStage === "submitted" && toStage === "pending_decision") {
    return {
      action: "start_decision_timer",
      description: "Decision timer started. A follow-up reminder has been scheduled for 30 days out.",
    };
  }
  if (fromStage === "pending_decision" && toStage === "awarded") {
    return {
      action: "create_compliance_calendar",
      description:
        "Congratulations! Compliance calendar created. Review your obligations in the Awarded panel.",
    };
  }
  if (fromStage === "pending_decision" && toStage === "declined") {
    return {
      action: "prompt_feedback_and_resubmission",
      description:
        "Marked as declined. Consider requesting feedback and flagging for resubmission next cycle.",
    };
  }
  return null;
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, stage, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (stage !== undefined && !VALID_STAGES.includes(stage as PipelineStage)) {
      return NextResponse.json(
        {
          error: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (stage !== undefined) updates.stage = stage;
    if (notes !== undefined) updates.notes = notes;

    // Fetch current item to verify ownership and capture previous stage
    const { data: item } = await supabase
      .from("grant_pipeline")
      .select("org_id, stage")
      .eq("id", id)
      .single();

    if (!item) {
      return NextResponse.json({ error: "Pipeline item not found" }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("org_id", item.org_id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { error } = await supabase
      .from("grant_pipeline")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const autoAction =
      stage !== undefined
        ? getAutoAction(item.stage ?? null, stage as PipelineStage)
        : null;

    return NextResponse.json({ success: true, autoAction });
  } catch (err) {
    console.error("PATCH /api/pipeline error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
