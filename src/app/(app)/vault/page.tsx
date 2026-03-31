import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DocumentChecklist, DOCUMENT_DEFINITIONS } from "@/components/vault/document-checklist";
import type { UploadedDocument } from "@/components/vault/document-checklist";
import { FolderLock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Upload limits per tier (null = unlimited)
const VAULT_UPLOAD_LIMITS: Record<string, number | null> = {
  free: 0,
  starter: 5,
  pro: null,
  enterprise: null,
};

export default async function VaultPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let uploadedDocs: UploadedDocument[] = [];
  const total = DOCUMENT_DEFINITIONS.length; // 13
  let tier = "free";

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
      // Fetch subscription tier
      const { data: sub } = await db
        .from("subscriptions")
        .select("tier")
        .eq("org_id", membership.org_id)
        .single();
      tier = sub?.tier ?? "free";
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
  const uploadLimit = VAULT_UPLOAD_LIMITS[tier] ?? null;
  const isFree = tier === "free";

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

      {/* Tier gate banner — Free users can't upload */}
      {isFree && (
        <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Document uploads require a paid plan
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Starter plan: 5 uploads. Pro+: unlimited. Upgrade to start building your vault.
              </p>
            </div>
            <Button
              className="shrink-0 bg-[var(--color-brand-teal)] text-white"
              render={<Link href="/upgrade">Upgrade Now</Link>}
            />
          </CardContent>
        </Card>
      )}

      {/* Starter plan usage banner */}
      {tier === "starter" && uploadLimit !== null && (
        <Card className="border-warm-200 dark:border-warm-800 bg-warm-50 dark:bg-warm-900/20">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm text-warm-700 dark:text-warm-300">
              <span className="font-semibold">{uploaded}</span> of{" "}
              <span className="font-semibold">{uploadLimit}</span> uploads used on Starter plan
            </p>
            {uploaded >= uploadLimit && (
              <Button
                size="sm"
                className="bg-[var(--color-brand-teal)] text-white"
                render={<Link href="/upgrade">Upgrade for unlimited</Link>}
              />
            )}
          </CardContent>
        </Card>
      )}

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
          <DocumentChecklist uploadedDocs={uploadedDocs} uploadLimit={uploadLimit} />
        </CardContent>
      </Card>
    </div>
  );
}
