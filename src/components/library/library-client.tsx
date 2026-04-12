"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { LibrarySearch } from "@/components/library/library-search";
import { AlternativeFunding } from "@/components/library/alternative-funding";

const TABS = [
  { id: "grants", label: "Grants" },
  { id: "loans", label: "Loans" },
  { id: "inkind", label: "In-Kind" },
  { id: "matching", label: "Matching" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function LibraryClient({ tier }: { tier: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("grants");

  return (
    <div className="max-w-6xl px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-start gap-3">
        <BookOpen className="h-6 w-6 text-brand-teal mt-0.5 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
            Grant Library
          </h1>
          <p className="text-sm text-warm-500 mt-0.5">
            Browse and search thousands of grants, loans, in-kind resources, and matching gift programs.
            {tier === "starter" && (
              <span className="ml-1 text-amber-600 font-medium">
                — showing up to 50 results per search
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center border-b border-warm-200 dark:border-warm-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.id
                ? "border-brand-teal text-brand-teal"
                : "border-transparent text-warm-500 hover:text-warm-700 dark:hover:text-warm-300"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "grants" && <LibrarySearch />}
      {activeTab === "loans" && <AlternativeFunding section="loans" />}
      {activeTab === "inkind" && <AlternativeFunding section="inkind" />}
      {activeTab === "matching" && <AlternativeFunding section="matching" />}
    </div>
  );
}
