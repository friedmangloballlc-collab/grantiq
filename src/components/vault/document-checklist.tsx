"use client";

import { useState, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  Minus,
  Upload,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RequirementType = "federal" | "foundation" | "both" | "sometimes" | "often" | "if_applicable" | "per_grant";

export interface DocumentDefinition {
  id: string;
  name: string;
  description: string;
  docType: string; // maps to upload-doc route document_type values
  requirement: RequirementType;
}

export interface UploadedDocument {
  id: string;
  docType: string;
  filename: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
}

interface DocumentChecklistProps {
  uploadedDocs: UploadedDocument[];
  /** Maximum number of uploads allowed for the tier (null = unlimited, 0 = blocked) */
  uploadLimit?: number | null;
}

// ─── Document Definitions (Module 3 Consulting System) ────────────────────────

export const DOCUMENT_DEFINITIONS: DocumentDefinition[] = [
  {
    id: "determination_letter",
    name: "501(c)(3) Determination Letter",
    description: "IRS letter confirming nonprofit tax-exempt status",
    docType: "other",
    requirement: "both",
  },
  {
    id: "articles_of_incorporation",
    name: "Articles of Incorporation",
    description: "State-filed document establishing the organization",
    docType: "other",
    requirement: "federal",
  },
  {
    id: "bylaws",
    name: "Bylaws",
    description: "Internal governance rules of the organization",
    docType: "other",
    requirement: "sometimes",
  },
  {
    id: "board_list",
    name: "Board of Directors List",
    description: "Current board members with contact information",
    docType: "board_list",
    requirement: "both",
  },
  {
    id: "org_budget",
    name: "Current Organizational Budget",
    description: "Most recent approved annual operating budget",
    docType: "other",
    requirement: "both",
  },
  {
    id: "audit",
    name: "Audited Financial Statements",
    description: "CPA-audited financials (often most recent 2 years)",
    docType: "audit",
    requirement: "often",
  },
  {
    id: "form_990",
    name: "Form 990 (Most Recent)",
    description: "Most recent IRS Form 990 tax return",
    docType: "form_990",
    requirement: "often",
  },
  {
    id: "uei_sam",
    name: "UEI Number / SAM.gov Registration",
    description: "Unique Entity Identifier and active SAM.gov registration",
    docType: "other",
    requirement: "federal",
  },
  {
    id: "indirect_cost",
    name: "Indirect Cost Rate Agreement",
    description: "Federally negotiated indirect cost rate (NICRA)",
    docType: "other",
    requirement: "if_applicable",
  },
  {
    id: "resumes",
    name: "Key Staff Resumes / Bios",
    description: "Resumes or bios for project director and key personnel",
    docType: "resume",
    requirement: "often",
  },
  {
    id: "org_chart",
    name: "Organizational Chart",
    description: "Visual overview of organizational structure",
    docType: "org_chart",
    requirement: "sometimes",
  },
  {
    id: "conflict_of_interest",
    name: "Conflict of Interest Policy",
    description: "Written COI policy signed by board members",
    docType: "dei_policy",
    requirement: "sometimes",
  },
  {
    id: "support_letters",
    name: "Letters of Support",
    description: "Community/partner letters supporting the project",
    docType: "support_letter",
    requirement: "per_grant",
  },
];

// ─── Requirement Badge ────────────────────────────────────────────────────────

function RequirementBadge({ type }: { type: RequirementType }) {
  const config: Record<RequirementType, { label: string; className: string }> = {
    federal: {
      label: "Federal",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    },
    foundation: {
      label: "Foundation",
      className: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
    },
    both: {
      label: "Federal + Foundation",
      className: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
    },
    often: {
      label: "Often Required",
      className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    },
    sometimes: {
      label: "Sometimes",
      className: "bg-warm-100 text-warm-600 dark:bg-warm-800 dark:text-warm-300",
    },
    if_applicable: {
      label: "If Applicable",
      className: "bg-warm-100 text-warm-500 dark:bg-warm-800 dark:text-warm-400",
    },
    per_grant: {
      label: "Per Grant",
      className: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
    },
  };

  const { label, className } = config[type];
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap",
        className
      )}
    >
      {label}
    </span>
  );
}

// ─── Single Document Row ──────────────────────────────────────────────────────

function DocumentRow({
  doc,
  uploaded,
  onUpload,
  onDelete,
  uploadBlocked,
}: {
  doc: DocumentDefinition;
  uploaded: UploadedDocument | undefined;
  onUpload: (docId: string, docType: string, file: File) => Promise<void>;
  onDelete: (docId: string, uploadedId: string) => Promise<void>;
  uploadBlocked?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await onUpload(doc.id, doc.docType, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!uploaded) return;
    setDeleting(true);
    try {
      await onDelete(doc.id, uploaded.id);
    } finally {
      setDeleting(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-warm-100 dark:border-warm-800 last:border-0">
      {/* Status icon */}
      <div className="mt-0.5 shrink-0">
        {uploaded ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : doc.requirement === "if_applicable" || doc.requirement === "per_grant" ? (
          <Minus className="h-5 w-5 text-warm-400" />
        ) : (
          <XCircle className="h-5 w-5 text-red-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
              {doc.name}
            </p>
            <p className="text-xs text-warm-500 mt-0.5">{doc.description}</p>
            {uploaded && (
              <p className="text-xs text-warm-500 mt-1">
                {uploaded.filename} &bull; {formatSize(uploaded.fileSize)} &bull; Uploaded {formatDate(uploaded.uploadedAt)}
              </p>
            )}
          </div>
          <div className="shrink-0">
            <RequirementBadge type={doc.requirement} />
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

        <div className="flex items-center gap-2 mt-2">
          {uploaded ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                render={
                  <a href={uploaded.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-3 w-3" />
                    View
                  </a>
                }
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 text-red-500 hover:text-red-600"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Delete
              </Button>
            </>
          ) : uploadBlocked ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 opacity-50 cursor-not-allowed"
              disabled
              title="Upgrade to upload documents"
            >
              <Upload className="h-3 w-3" />
              Upload
            </Button>
          ) : (
            <>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Document Checklist ───────────────────────────────────────────────────────

export function DocumentChecklist({ uploadedDocs: initialDocs, uploadLimit }: DocumentChecklistProps) {
  const [docs, setDocs] = useState<UploadedDocument[]>(initialDocs);

  const getUploaded = (docId: string) =>
    docs.find((d) => {
      const def = DOCUMENT_DEFINITIONS.find((dd) => dd.id === docId);
      return def && d.docType === def.docType;
    });

  const handleUpload = async (docId: string, docType: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", docType);

    const res = await fetch("/api/onboarding/upload-doc", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Upload failed");
    }

    const data = await res.json();

    const newDoc: UploadedDocument = {
      id: data.doc_id ?? docId,
      docType,
      filename: file.name,
      fileUrl: data.file_url ?? "",
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
    };

    setDocs((prev) => [...prev, newDoc]);
  };

  const handleDelete = async (_docId: string, uploadedId: string) => {
    // Optimistic removal — actual deletion can be wired to a DELETE API route
    setDocs((prev) => prev.filter((d) => d.id !== uploadedId));
  };

  // uploadBlocked: true when limit is 0 (free) or upload count reached limit
  const uploadBlocked =
    uploadLimit !== undefined &&
    uploadLimit !== null &&
    (uploadLimit === 0 || docs.length >= uploadLimit);

  return (
    <div className="divide-y-0">
      {DOCUMENT_DEFINITIONS.map((def) => (
        <DocumentRow
          key={def.id}
          doc={def}
          uploaded={getUploaded(def.id)}
          onUpload={handleUpload}
          onDelete={handleDelete}
          uploadBlocked={uploadBlocked}
        />
      ))}
    </div>
  );
}
