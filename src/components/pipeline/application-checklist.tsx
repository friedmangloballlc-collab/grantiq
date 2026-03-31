"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Square,
  FileText,
  PenTool,
  Calculator,
  ClipboardCheck,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateChecklist,
  checklistProgress,
  CATEGORY_LABELS,
  FEATURE_ACTION_LABELS,
  type ChecklistItem,
  type GrantSource,
  type OrgCapabilities,
} from "@/lib/grants/application-checklist";

const CATEGORY_ICONS: Record<ChecklistItem["category"], React.ElementType> = {
  document: FileText,
  content: PenTool,
  budget: Calculator,
  admin: ClipboardCheck,
};

const STATUS_COLORS: Record<ChecklistItem["status"], string> = {
  complete: "text-green-600 dark:text-green-400",
  in_progress: "text-amber-600 dark:text-amber-400",
  not_started: "text-warm-400",
};

const STATUS_LABELS: Record<ChecklistItem["status"], string> = {
  complete: "Complete",
  in_progress: "In Progress",
  not_started: "Not Started",
};

interface ApplicationChecklistProps {
  grant: GrantSource;
  orgDocuments?: string[];
  orgCapabilities?: Partial<OrgCapabilities>;
}

export function ApplicationChecklist({
  grant,
  orgDocuments = [],
  orgCapabilities = {},
}: ApplicationChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>(() =>
    generateChecklist(grant, orgDocuments, orgCapabilities)
  );
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );

  const toggleStatus = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next: ChecklistItem["status"] =
          item.status === "not_started"
            ? "in_progress"
            : item.status === "in_progress"
            ? "complete"
            : "not_started";
        return { ...item, status: next };
      })
    );
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const { total, complete, percent } = checklistProgress(items);

  const categories = (
    ["document", "content", "budget", "admin"] as ChecklistItem["category"][]
  ).filter((cat) => items.some((i) => i.category === cat));

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-warm-900 dark:text-warm-50">
          Application Checklist
        </h3>
        <span className="text-xs text-warm-500">
          {complete} of {total} items complete ({percent}%)
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-warm-200 dark:bg-warm-700 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            percent === 100
              ? "bg-green-500"
              : percent >= 50
              ? "bg-brand-teal"
              : "bg-amber-500"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Category groups */}
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat);
        const catComplete = catItems.filter((i) => i.status === "complete").length;
        const Icon = CATEGORY_ICONS[cat];
        const isCollapsed = collapsedCategories.has(cat);

        return (
          <div
            key={cat}
            className="border border-warm-200 dark:border-warm-700 rounded-lg overflow-hidden"
          >
            {/* Category header */}
            <button
              onClick={() => toggleCategory(cat)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-warm-50 dark:bg-warm-800/50 hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-warm-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-warm-600 dark:text-warm-400">
                  {CATEGORY_LABELS[cat]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-warm-400">
                  {catComplete}/{catItems.length}
                </span>
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-warm-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-warm-400" />
                )}
              </div>
            </button>

            {/* Items */}
            {!isCollapsed && (
              <div className="divide-y divide-warm-100 dark:divide-warm-800">
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 px-4 py-3 bg-white dark:bg-warm-900 hover:bg-warm-50 dark:hover:bg-warm-800/40 transition-colors"
                  >
                    {/* Checkbox toggle */}
                    <button
                      onClick={() => toggleStatus(item.id)}
                      className="mt-0.5 shrink-0"
                      aria-label={`Toggle ${item.item}`}
                    >
                      {item.status === "complete" ? (
                        <CheckSquare className="w-4 h-4 text-green-500" />
                      ) : item.status === "in_progress" ? (
                        <CheckSquare className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Square className="w-4 h-4 text-warm-300 dark:text-warm-600" />
                      )}
                    </button>

                    {/* Label + meta */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm",
                          item.status === "complete"
                            ? "line-through text-warm-400"
                            : "text-warm-800 dark:text-warm-200"
                        )}
                      >
                        {item.item}
                        {item.required && (
                          <span className="ml-1 text-xs text-red-500">*</span>
                        )}
                      </p>
                      <span
                        className={cn(
                          "text-xs",
                          STATUS_COLORS[item.status]
                        )}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>

                    {/* Action link */}
                    {item.linkedFeature &&
                      FEATURE_ACTION_LABELS[item.linkedFeature] &&
                      item.status !== "complete" && (
                        <Link
                          href={FEATURE_ACTION_LABELS[item.linkedFeature].href(grant.id)}
                          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 transition-colors whitespace-nowrap"
                        >
                          {FEATURE_ACTION_LABELS[item.linkedFeature].label}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-xs text-warm-400">
        * Required items. Click an item to cycle its status.
      </p>
    </div>
  );
}
