import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const BUCKET = "org-documents";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Map mime types to document_vault doc types
const DOCUMENT_TYPE_VALUES = new Set([
  "board_list",
  "org_chart",
  "audit",
  "form_990",
  "resume",
  "support_letter",
  "dei_policy",
  "logic_model",
  "other",
]);

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get("file");
    const rawDocType = formData.get("document_type");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const docType =
      typeof rawDocType === "string" && DOCUMENT_TYPE_VALUES.has(rawDocType)
        ? rawDocType
        : "other";

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Allowed: PDF, DOC, DOCX, PNG, JPG" },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 10 MB limit" },
        { status: 400 }
      );
    }

    const db = createAdminClient();

    // Get org
    const { data: membership } = await db
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const orgId = membership.org_id as string;

    // Ensure bucket exists (handle gracefully if it doesn't)
    const { error: bucketError } = await db.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE,
    });

    // Ignore "already exists" error (Postgres unique violation / storage duplicate)
    if (bucketError && !bucketError.message.toLowerCase().includes("already exists")) {
      logger.warn("Storage bucket creation warning", { message: bucketError.message });
    }

    // Build storage path
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${orgId}/${timestamp}_${safeName}`;

    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error("Storage upload error", { message: uploadError.message });
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      );
    }

    // Get public URL (or signed URL — using public path format for org-documents)
    const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(storagePath);
    const fileUrl = urlData.publicUrl;

    // Insert into document_vault
    const { data: vaultRow, error: vaultError } = await db
      .from("document_vault")
      .insert({
        org_id: orgId,
        uploaded_by: user.id,
        document_type: docType,
        original_filename: file.name,
        file_url: fileUrl,
        mime_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        status: "active",
      })
      .select("id")
      .single();

    if (vaultError) {
      logger.error("document_vault insert error", { message: vaultError.message });
      // File is in storage but DB insert failed — return partial success
      return NextResponse.json(
        { success: true, warning: "File uploaded but metadata save failed", doc_id: null },
        { status: 207 }
      );
    }

    return NextResponse.json({
      success: true,
      doc_id: (vaultRow as { id: string }).id,
      file_url: fileUrl,
    });
  } catch (err) {
    logger.error("upload-doc route error", { err: String(err) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
