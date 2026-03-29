import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;
    const db = createAdminClient();

    const { data: job, error } = await db
      .from("job_queue")
      .select("id, job_type, status, payload, completed_at, error_message, created_at")
      .eq("id", jobId)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify user has access to this job's org
    const orgId = (job.payload as Record<string, unknown>)?.org_id as string | undefined;
    if (orgId) {
      const { data: membership } = await supabase
        .from("org_members")
        .select("role")
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (!membership) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    return NextResponse.json({
      job_id: job.id,
      job_type: job.job_type,
      status: job.status,
      completed_at: job.completed_at,
      error_message: job.error_message,
      created_at: job.created_at,
    });
  } catch (err) {
    console.error("GET /api/jobs/status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
