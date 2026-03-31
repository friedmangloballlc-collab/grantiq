import Link from "next/link";
import { FolderLock, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VaultSummaryProps {
  uploaded: number;
  total: number;
  blockedFederalCount: number;
  nextUploadHint?: string;
}

export function VaultSummary({
  uploaded,
  total,
  blockedFederalCount,
  nextUploadHint,
}: VaultSummaryProps) {
  const pct = Math.round((uploaded / total) * 100);
  const missing = total - uploaded;

  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderLock className="h-4 w-4 text-brand-teal" />
            <span className="text-sm font-semibold text-warm-900 dark:text-warm-50">
              Document Vault
            </span>
          </div>
          <span className="text-xs font-medium text-warm-500">
            {uploaded}/{total} Complete
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-warm-100 dark:bg-warm-800 rounded-full overflow-hidden mb-3">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Alerts */}
        {blockedFederalCount > 0 && (
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-warm-600 dark:text-warm-400">
              {missing} missing document{missing !== 1 ? "s" : ""} block{missing === 1 ? "s" : ""}{" "}
              <strong>{blockedFederalCount} federal grant{blockedFederalCount !== 1 ? "s" : ""}</strong>
            </p>
          </div>
        )}

        {nextUploadHint && (
          <p className="text-xs text-brand-teal mb-3">{nextUploadHint}</p>
        )}

        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs gap-1"
          render={
            <Link href="/vault">
              <ArrowRight className="h-3 w-3" />
              Manage Documents
            </Link>
          }
        />
      </CardContent>
    </Card>
  );
}
