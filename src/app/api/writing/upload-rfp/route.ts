// grantaq/src/app/api/writing/upload-rfp/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseRfp } from "@/lib/ai/writing/rfp-parser";
import { z } from "zod";

const TextUploadSchema = z.object({
  source_type: z.literal("text_paste"),
  text: z.string().min(200, "Text must be at least 200 characters"),
  grant_source_id: z.string().uuid().optional(),
  pipeline_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";

  // Handle PDF upload (multipart/form-data)
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const orgId = formData.get("org_id") as string | null;
    const grantSourceId = formData.get("grant_source_id") as string | null;
    const pipelineId = formData.get("pipeline_id") as string | null;

    if (!file || !orgId) {
      return NextResponse.json({ error: "file and org_id are required" }, { status: 400 });
    }

    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();
    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 20MB" }, { status: 400 });
    }

    // Upload to Supabase Storage
    const filePath = `${orgId}/rfp/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("rfp-uploads")
      .upload(filePath, buffer, { contentType: "application/pdf" });

    if (uploadError) {
      return NextResponse.json({ error: "File upload failed" }, { status: 500 });
    }

    const result = await parseRfp({
      org_id: orgId,
      source_type: "pdf_upload",
      pdf_buffer: buffer,
      file_url: filePath,
      grant_source_id: grantSourceId || undefined,
      pipeline_id: pipelineId || undefined,
    });

    return NextResponse.json(result);
  }

  // Handle text paste (JSON body)
  const body = await req.json();
  const orgId = body.org_id;
  if (!orgId) return NextResponse.json({ error: "org_id is required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();
  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const parsed = TextUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await parseRfp({
    org_id: orgId,
    source_type: "text_paste",
    raw_text: parsed.data.text,
    grant_source_id: parsed.data.grant_source_id,
    pipeline_id: parsed.data.pipeline_id,
  });

  return NextResponse.json(result);
}
