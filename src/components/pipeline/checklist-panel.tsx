"use client";

import { useState } from "react";
import { X, ClipboardList, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import type { PipelineItem } from "./kanban-board";
import { ApplicationChecklist } from "./application-checklist";
import type { GrantSource } from "@/lib/grants/application-checklist";

interface ChecklistPanelProps {
  item: PipelineItem;
  onClose: () => void;
  onRemove?: (itemId: string) => void;
}

const STAGE_LABEL: Record<string, string> = {
  identified: "Identified — Ready to Start",
  qualified: "Qualified",
  in_development: "In Development",
};

export function ChecklistPanel({ item, onClose, onRemove }: ChecklistPanelProps) {
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    if (!onRemove) return;
    if (!confirm(`Remove "${item.grantName}" from your pipeline?`)) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/pipeline?id=${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Failed to remove from pipeline");
        setRemoving(false);
        return;
      }
      onRemove(item.id);
      onClose();
    } catch {
      alert("Failed to remove from pipeline");
      setRemoving(false);
    }
  }

  // Build a minimal GrantSource from the pipeline item.
  // Use grantSourceId so downstream actions (e.g., write/evaluate)
  // resolve to the real grant, not the pipeline row.
  const grant: GrantSource = {
    id: item.grantSourceId,
    name: item.grantName,
    funder_name: item.funderName,
    source_type: "foundation",
    amount_max: item.amount,
    amount_min: null,
    deadline: item.deadline,
    eligibility_types: [],
    category: null,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md bg-white dark:bg-warm-900 rounded-xl shadow-2xl border border-warm-200 dark:border-warm-700 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-warm-200 dark:border-warm-700 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {STAGE_LABEL[item.stage] ?? item.stage}
              </span>
            </div>
            <h2 className="text-base font-bold text-warm-900 dark:text-warm-50 mt-1 leading-tight">
              {item.grantName}
            </h2>
            <p className="text-xs text-warm-500 mt-0.5">{item.funderName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-warm-100 dark:hover:bg-warm-800 text-warm-400 hover:text-warm-700 dark:hover:text-warm-300 transition-colors ml-2 shrink-0"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Checklist */}
        <div className="overflow-y-auto flex-1 p-4">
          <ApplicationChecklist grant={grant} />
        </div>

        {/* Footer: primary action + link to full grant detail */}
        <div className="p-4 border-t border-warm-200 dark:border-warm-700 flex-shrink-0 space-y-2">
          <Link
            href={`/grants/${item.grantSourceId}/write`}
            className="block w-full text-center px-4 py-2 rounded-lg bg-brand-teal text-white font-medium text-sm hover:bg-brand-teal/90 transition-colors"
            onClick={onClose}
          >
            Start Writing Application
          </Link>
          <div className="flex items-center justify-between">
            <Link
              href={`/grants/${item.grantSourceId}`}
              className="inline-flex items-center gap-1.5 text-sm text-brand-teal hover:underline"
              onClick={onClose}
            >
              View full grant detail
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            {onRemove && (
              <button
                onClick={handleRemove}
                disabled={removing}
                className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                aria-label="Remove from pipeline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {removing ? "Removing…" : "Remove"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
