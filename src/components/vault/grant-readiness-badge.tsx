import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOCUMENT_DEFINITIONS } from "./document-checklist";
import type { UploadedDocument } from "./document-checklist";

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceType = "federal" | "foundation" | string;

type ReadinessLevel = "ready" | "almost" | "not_ready";

interface ReadinessResult {
  level: ReadinessLevel;
  missingNames: string[];
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * Determines which documents are required for a given source type and checks
 * which are present in the vault.
 */
export function computeReadiness(
  sourceType: SourceType,
  uploadedDocs: UploadedDocument[]
): ReadinessResult {
  const uploadedTypes = new Set(uploadedDocs.map((d) => d.docType));

  const required = DOCUMENT_DEFINITIONS.filter((def) => {
    if (sourceType === "federal") {
      return def.requirement === "federal" || def.requirement === "both";
    }
    if (sourceType === "foundation") {
      return def.requirement === "foundation" || def.requirement === "both";
    }
    // For state/corporate/other — use "both" docs as baseline
    return def.requirement === "both";
  });

  const missing = required.filter((def) => !uploadedTypes.has(def.docType));
  const missingNames = missing.map((d) => d.name);

  let level: ReadinessLevel;
  if (missingNames.length === 0) {
    level = "ready";
  } else if (missingNames.length <= 2) {
    level = "almost";
  } else {
    level = "not_ready";
  }

  return { level, missingNames };
}

// ─── Badge Component ──────────────────────────────────────────────────────────

interface GrantReadinessBadgeProps {
  sourceType: SourceType;
  uploadedDocs: UploadedDocument[];
  /** If true, shows truncated missing list inline */
  showMissing?: boolean;
  className?: string;
}

export function GrantReadinessBadge({
  sourceType,
  uploadedDocs,
  showMissing = true,
  className,
}: GrantReadinessBadgeProps) {
  const { level, missingNames } = computeReadiness(sourceType, uploadedDocs);

  const config = {
    ready: {
      label: "Ready to Apply",
      icon: CheckCircle2,
      badgeClass:
        "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border-green-200 dark:border-green-800",
    },
    almost: {
      label: "Almost Ready",
      icon: AlertCircle,
      badgeClass:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-200 dark:border-amber-800",
    },
    not_ready: {
      label: "Not Ready",
      icon: XCircle,
      badgeClass:
        "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-200 dark:border-red-800",
    },
  };

  const { label, icon: Icon, badgeClass } = config[level];

  // Truncate long doc names for inline display
  const truncated = (name: string) => {
    const short: Record<string, string> = {
      "501(c)(3) Determination Letter": "501c3",
      "UEI Number / SAM.gov Registration": "SAM.gov",
      "Current Organizational Budget": "budget",
      "Audited Financial Statements": "audit",
      "Board of Directors List": "board list",
      "Articles of Incorporation": "articles",
      "Form 990 (Most Recent)": "990",
    };
    return short[name] ?? name;
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
          badgeClass
        )}
      >
        <Icon className="h-3 w-3" />
        {label}
      </span>
      {showMissing && missingNames.length > 0 && (
        <p className="text-xs text-warm-500 dark:text-warm-400">
          missing: {missingNames.map(truncated).join(", ")}
        </p>
      )}
    </div>
  );
}
