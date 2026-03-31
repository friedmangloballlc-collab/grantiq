"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Download,
  Sparkles,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { BudgetNarrativeResult, BudgetNarrativeContext } from "@/lib/ai/writing/budget-narrative";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BudgetCategory =
  | "personnel"
  | "fringe"
  | "travel"
  | "equipment"
  | "supplies"
  | "contractual"
  | "other"
  | "indirect";

export interface BudgetLineItem {
  id: string;
  category: BudgetCategory;
  description: string;
  quantity: number;
  unitCost: number;
  total: number;
}

const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  personnel: "Personnel",
  fringe: "Fringe Benefits",
  travel: "Travel",
  equipment: "Equipment",
  supplies: "Supplies",
  contractual: "Contractual / Consultants",
  other: "Other Direct Costs",
  indirect: "Indirect Costs",
};

const CATEGORY_ORDER: BudgetCategory[] = [
  "personnel",
  "fringe",
  "travel",
  "equipment",
  "supplies",
  "contractual",
  "other",
  "indirect",
];

const INDIRECT_RATE_OPTIONS = [
  { label: "10% de minimis (federal default)", value: 0.1 },
  { label: "15%", value: 0.15 },
  { label: "20%", value: 0.2 },
  { label: "25%", value: 0.25 },
  { label: "Custom", value: -1 },
];

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BudgetBuilderProps {
  grantId: string;
  grantName: string;
  funderName: string;
  sourceType: string;
  amountMax: number | null;
  amountMin: number | null;
  orgName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BudgetBuilder({
  grantId,
  grantName,
  funderName,
  sourceType,
  amountMax,
  amountMin,
  orgName,
}: BudgetBuilderProps) {
  const [lineItems, setLineItems] = useState<BudgetLineItem[]>([]);
  const [collapsedCats, setCollapsedCats] = useState<Set<BudgetCategory>>(
    new Set()
  );
  const [indirectRateOption, setIndirectRateOption] = useState(0.1);
  const [customRate, setCustomRate] = useState(10);
  const [isCustomRate, setIsCustomRate] = useState(false);

  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeResult, setNarrativeResult] =
    useState<BudgetNarrativeResult | null>(null);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);
  const [copiedNarrative, setCopiedNarrative] = useState(false);

  const effectiveRate = isCustomRate ? customRate / 100 : indirectRateOption;

  // ─── Derived totals ─────────────────────────────────────────────────────────

  const directCosts = lineItems
    .filter((i) => i.category !== "indirect")
    .reduce((sum, i) => sum + i.total, 0);

  const indirectAutoTotal = Math.round(directCosts * effectiveRate);

  const grandTotal =
    directCosts +
    lineItems
      .filter((i) => i.category === "indirect")
      .reduce((sum, i) => sum + i.total, 0) +
    (lineItems.some((i) => i.category === "indirect")
      ? 0
      : indirectAutoTotal);

  // ─── Budget validation ──────────────────────────────────────────────────────

  const budgetWarning =
    amountMax && grandTotal > amountMax
      ? `Your budget of ${formatCurrency(grandTotal)} exceeds this grant's max award of ${formatCurrency(amountMax)}.`
      : amountMin && grandTotal < amountMin
      ? `Your budget of ${formatCurrency(grandTotal)} is below this grant's minimum request of ${formatCurrency(amountMin)}.`
      : null;

  // ─── Line item management ───────────────────────────────────────────────────

  const addItem = (category: BudgetCategory) => {
    const newItem: BudgetLineItem = {
      id: generateId(),
      category,
      description: "",
      quantity: 1,
      unitCost: 0,
      total: 0,
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  const updateItem = (
    id: string,
    field: keyof Omit<BudgetLineItem, "id" | "category" | "total">,
    value: string | number
  ) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        updated.total = Math.round(updated.quantity * updated.unitCost);
        return updated;
      })
    );
  };

  const removeItem = (id: string) => {
    setLineItems((prev) => prev.filter((i) => i.id !== id));
  };

  const toggleCategory = (cat: BudgetCategory) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  // ─── CSV export ─────────────────────────────────────────────────────────────

  const exportCSV = useCallback(() => {
    const rows = [
      ["Category", "Description", "Quantity", "Unit Cost", "Total"],
      ...lineItems.map((i) => [
        CATEGORY_LABELS[i.category],
        i.description,
        String(i.quantity),
        String(i.unitCost),
        String(i.total),
      ]),
      ["", "", "", "Direct Costs", String(directCosts)],
      [
        "",
        `Indirect (${Math.round(effectiveRate * 100)}%)`,
        "",
        "",
        String(indirectAutoTotal),
      ],
      ["", "", "", "GRAND TOTAL", String(grandTotal)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-${grantId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [lineItems, directCosts, indirectAutoTotal, grandTotal, effectiveRate, grantId]);

  // ─── Generate narrative ─────────────────────────────────────────────────────

  const handleGenerateNarrative = async () => {
    if (lineItems.length === 0) return;
    setNarrativeLoading(true);
    setNarrativeError(null);
    setNarrativeResult(null);

    try {
      const ctx: BudgetNarrativeContext = {
        grantName,
        funderName,
        sourceType,
        amountMax,
        orgName,
      };

      const res = await fetch(`/api/grants/${grantId}/budget/narrative`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItems, context: ctx }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to generate narrative");
      }

      const data = (await res.json()) as BudgetNarrativeResult;
      setNarrativeResult(data);
    } catch (err) {
      setNarrativeError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setNarrativeLoading(false);
    }
  };

  const copyNarrative = () => {
    if (!narrativeResult) return;
    const text = [
      narrativeResult.overallNarrative,
      "",
      ...Object.entries(narrativeResult.categoryJustifications).map(
        ([cat, text]) => `${CATEGORY_LABELS[cat as BudgetCategory] ?? cat}\n${text}`
      ),
      "",
      ...lineItems.map(
        (item) =>
          `${item.description}: ${narrativeResult.narratives[item.id] ?? ""}`
      ),
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopiedNarrative(true);
    setTimeout(() => setCopiedNarrative(false), 2000);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const activeCategories = CATEGORY_ORDER.filter((cat) =>
    lineItems.some((i) => i.category === cat)
  );

  return (
    <div className="space-y-6">
      {/* Budget warning */}
      {budgetWarning && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-sm">{budgetWarning}</p>
        </div>
      )}

      {/* Grand total summary */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-warm-50 dark:bg-warm-800/30 rounded-lg border border-warm-200 dark:border-warm-700">
        <div>
          <p className="text-xs text-warm-500">Direct Costs</p>
          <p className="text-lg font-bold text-warm-900 dark:text-warm-50">
            {formatCurrency(directCosts)}
          </p>
        </div>
        <div>
          <p className="text-xs text-warm-500">
            Indirect ({Math.round(effectiveRate * 100)}%)
          </p>
          <p className="text-lg font-bold text-warm-900 dark:text-warm-50">
            {formatCurrency(indirectAutoTotal)}
          </p>
        </div>
        <div>
          <p className="text-xs text-warm-500">Grand Total</p>
          <p
            className={cn(
              "text-lg font-bold",
              budgetWarning
                ? "text-amber-600 dark:text-amber-400"
                : "text-brand-teal"
            )}
          >
            {formatCurrency(grandTotal)}
          </p>
        </div>
      </div>

      {/* Indirect cost rate selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-warm-700 dark:text-warm-300 shrink-0">
          Indirect Rate:
        </span>
        <div className="flex flex-wrap gap-2">
          {INDIRECT_RATE_OPTIONS.map((opt) => {
            const isActive =
              opt.value === -1
                ? isCustomRate
                : !isCustomRate && indirectRateOption === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  if (opt.value === -1) {
                    setIsCustomRate(true);
                  } else {
                    setIsCustomRate(false);
                    setIndirectRateOption(opt.value);
                  }
                }}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  isActive
                    ? "bg-brand-teal text-white"
                    : "bg-warm-100 dark:bg-warm-800 text-warm-600 dark:text-warm-400 hover:bg-warm-200 dark:hover:bg-warm-700"
                )}
              >
                {opt.label}
              </button>
            );
          })}
          {isCustomRate && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={100}
                value={customRate}
                onChange={(e) => setCustomRate(Number(e.target.value))}
                className="w-16 px-2 py-1 text-xs border border-warm-300 dark:border-warm-600 rounded-md bg-white dark:bg-warm-900 text-warm-900 dark:text-warm-100"
              />
              <span className="text-xs text-warm-500">%</span>
            </div>
          )}
        </div>
      </div>

      {/* Line item categories */}
      {CATEGORY_ORDER.map((cat) => {
        const catItems = lineItems.filter((i) => i.category === cat);
        const catTotal = catItems.reduce((s, i) => s + i.total, 0);
        const isCollapsed = collapsedCats.has(cat);

        return (
          <div
            key={cat}
            className="border border-warm-200 dark:border-warm-700 rounded-lg overflow-hidden"
          >
            {/* Category header */}
            <div className="flex items-center justify-between px-4 py-3 bg-warm-50 dark:bg-warm-800/50">
              <button
                onClick={() => toggleCategory(cat)}
                className="flex items-center gap-2 text-left"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-warm-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-warm-400" />
                )}
                <span className="text-sm font-semibold text-warm-800 dark:text-warm-200">
                  {CATEGORY_LABELS[cat]}
                </span>
                {catItems.length > 0 && (
                  <span className="text-xs text-warm-400">
                    ({catItems.length} item{catItems.length !== 1 ? "s" : ""})
                  </span>
                )}
              </button>
              <div className="flex items-center gap-3">
                {catTotal > 0 && (
                  <span className="text-sm font-medium text-warm-700 dark:text-warm-300">
                    {formatCurrency(catTotal)}
                  </span>
                )}
                <button
                  onClick={() => addItem(cat)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>

            {/* Items table */}
            {!isCollapsed && catItems.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-warm-100 dark:border-warm-800 bg-white dark:bg-warm-900">
                      <th className="text-left px-4 py-2 text-xs font-medium text-warm-500 w-full">
                        Description
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-warm-500 whitespace-nowrap">
                        Qty
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-warm-500 whitespace-nowrap">
                        Unit Cost
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-warm-500 whitespace-nowrap">
                        Total
                      </th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-100 dark:divide-warm-800">
                    {catItems.map((item) => (
                      <tr
                        key={item.id}
                        className="bg-white dark:bg-warm-900 hover:bg-warm-50 dark:hover:bg-warm-800/40 transition-colors"
                      >
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.description}
                            placeholder={`e.g., ${cat === "personnel" ? "Program Director (50% FTE)" : cat === "travel" ? "Conference registration + airfare" : "Description"}`}
                            onChange={(e) =>
                              updateItem(item.id, "description", e.target.value)
                            }
                            className="w-full text-sm bg-transparent text-warm-800 dark:text-warm-200 placeholder:text-warm-300 dark:placeholder:text-warm-600 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "quantity",
                                Number(e.target.value)
                              )
                            }
                            className="w-16 text-right text-sm bg-transparent text-warm-800 dark:text-warm-200 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-0.5">
                            <span className="text-warm-400 text-xs">$</span>
                            <input
                              type="number"
                              min={0}
                              value={item.unitCost}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "unitCost",
                                  Number(e.target.value)
                                )
                              }
                              className="w-24 text-right text-sm bg-transparent text-warm-800 dark:text-warm-200 focus:outline-none"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-medium text-warm-800 dark:text-warm-200 whitespace-nowrap">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="pr-3 py-2">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 rounded text-warm-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            aria-label="Remove line item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {catItems.length > 1 && (
                    <tfoot>
                      <tr className="border-t border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-800/30">
                        <td
                          colSpan={3}
                          className="px-4 py-2 text-xs font-semibold text-warm-500 text-right"
                        >
                          Subtotal
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-bold text-warm-800 dark:text-warm-200">
                          {formatCurrency(catTotal)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {!isCollapsed && catItems.length === 0 && (
              <div className="px-4 py-6 text-center bg-white dark:bg-warm-900">
                <p className="text-xs text-warm-400">
                  No items yet.{" "}
                  <button
                    onClick={() => addItem(cat)}
                    className="text-brand-teal hover:underline"
                  >
                    Add a line item
                  </button>
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Add category buttons */}
      {activeCategories.length < CATEGORY_ORDER.length && (
        <div>
          <p className="text-xs text-warm-500 mb-2">Add a budget category:</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ORDER.filter(
              (cat) => !lineItems.some((i) => i.category === cat)
            ).map((cat) => (
              <button
                key={cat}
                onClick={() => addItem(cat)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-400 hover:bg-warm-50 dark:hover:bg-warm-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          size="sm"
          onClick={handleGenerateNarrative}
          disabled={lineItems.length === 0 || narrativeLoading}
          className="bg-brand-teal hover:bg-brand-teal-dark text-white"
        >
          {narrativeLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Generate Budget Narrative
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={exportCSV}
          disabled={lineItems.length === 0}
          className="border-warm-300 dark:border-warm-600"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {/* Narrative result */}
      {narrativeError && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {narrativeError}
        </div>
      )}

      {narrativeResult && (
        <div className="border border-warm-200 dark:border-warm-700 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-warm-50 dark:bg-warm-800/50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-teal" />
              <span className="text-sm font-semibold text-warm-800 dark:text-warm-200">
                AI Budget Narrative
              </span>
              <span className="text-xs text-warm-400">
                ({narrativeResult.totalWords} words)
              </span>
            </div>
            <button
              onClick={copyNarrative}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 transition-colors"
            >
              {copiedNarrative ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy All
                </>
              )}
            </button>
          </div>
          <div className="p-4 bg-white dark:bg-warm-900 space-y-4 max-h-96 overflow-y-auto">
            {/* Overall narrative */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-warm-500 mb-1.5">
                Overview
              </h4>
              <p className="text-sm text-warm-700 dark:text-warm-300 leading-relaxed">
                {narrativeResult.overallNarrative}
              </p>
            </div>

            {/* Category justifications */}
            {Object.keys(narrativeResult.categoryJustifications).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-warm-500 mb-2">
                  Category Justifications
                </h4>
                <div className="space-y-2">
                  {Object.entries(narrativeResult.categoryJustifications).map(
                    ([cat, text]) => (
                      <div key={cat}>
                        <p className="text-xs font-semibold text-warm-600 dark:text-warm-400">
                          {CATEGORY_LABELS[cat as BudgetCategory] ?? cat}
                        </p>
                        <p className="text-sm text-warm-700 dark:text-warm-300 leading-relaxed">
                          {text}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Line item narratives */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-warm-500 mb-2">
                Line Item Justifications
              </h4>
              <div className="space-y-3">
                {lineItems.map((item) => (
                  <div key={item.id}>
                    <p className="text-xs font-semibold text-warm-600 dark:text-warm-400">
                      {item.description || "(unnamed item)"}{" "}
                      <span className="font-normal text-warm-400">
                        {formatCurrency(item.total)}
                      </span>
                    </p>
                    <p className="text-sm text-warm-700 dark:text-warm-300 leading-relaxed">
                      {narrativeResult.narratives[item.id] ??
                        "No narrative generated."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
