import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DocumentChecklist, DOCUMENT_DEFINITIONS } from "@/components/vault/document-checklist";
import type { UploadedDocument } from "@/components/vault/document-checklist";
import { FolderLock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function VaultPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let uploadedDocs: UploadedDocument[] = [];
  const total = DOCUMENT_DEFINITIONS.length; // 13

  if (user) {
    const db = createAdminClient();

    const { data: membership } = await db
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (membership?.org_id) {
      const { data: vaultRows } = await db
        .from("document_vault")
        .select("id, document_type, original_filename, file_url, file_size, created_at")
        .eq("org_id", membership.org_id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (vaultRows) {
        // Deduplicate by document_type — keep most recent per type
        const seen = new Set<string>();
        for (const row of vaultRows) {
          const r = row as {
            id: string;
            document_type: string;
            original_filename: string;
            file_url: string;
            file_size: number;
            created_at: string;
          };
          if (!seen.has(r.document_type)) {
            seen.add(r.document_type);
            uploadedDocs.push({
              id: r.id,
              docType: r.document_type,
              filename: r.original_filename,
              fileUrl: r.file_url,
              fileSize: r.file_size,
              uploadedAt: r.created_at,
            });
          }
        }
      }
    }
  }

  const uploaded = uploadedDocs.length;
  const pct = Math.round((uploaded / total) * 100);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <FolderLock className="h-6 w-6 text-brand-teal" />
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
            Document Vault
          </h1>
        </div>
        <p className="text-sm text-warm-500 mt-1">
          Upload and manage the documents grant funders require most.
        </p>
      </div>

      {/* Completeness summary */}
      <Card className="border-warm-200 dark:border-warm-800">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">
              Document Completeness
            </p>
            <span className="text-sm font-bold text-warm-700 dark:text-warm-300">
              {uploaded} of {total} documents ({pct}%)
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-3 bg-warm-100 dark:bg-warm-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                pct >= 80
                  ? "bg-green-500"
                  : pct >= 50
                  ? "bg-amber-400"
                  : "bg-red-400"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-warm-500 mt-2">
            {total - uploaded === 0
              ? "All documents uploaded — you are fully prepared."
              : `${total - uploaded} document${total - uploaded !== 1 ? "s" : ""} still needed for full readiness.`}
          </p>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card className="border-warm-200 dark:border-warm-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Required Documents Checklist</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <DocumentChecklist uploadedDocs={uploadedDocs} />
        </CardContent>
      </Card>
    </div>
  );
}
