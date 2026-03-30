"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import Link from "next/link";

interface CalcResult {
  totalMatches: number;
  estimatedMissedFunding: number;
  topCategories: Array<{ category: string; count: number }>;
}

export default function FundingGapPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [form, setForm] = useState({
    entityType: "nonprofit_501c3",
    annualBudget: "",
    state: "",
    missionArea: "",
  });

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tools/funding-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          annualBudget: parseInt(form.annualBudget) || 100000,
        }),
      });
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="text-center mb-8">
        <Sparkles className="h-8 w-8 text-brand-teal mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50">
          Funding Gap Calculator
        </h1>
        <p className="text-warm-500 mt-2">
          See how much grant funding your organization might be missing.
        </p>
      </div>

      <Card className="border-warm-200 dark:border-warm-800">
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Organization Type</Label>
            <select
              value={form.entityType}
              onChange={(e) => setForm({ ...form, entityType: e.target.value })}
              className="w-full mt-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-transparent px-3 py-2 text-sm"
            >
              <option value="nonprofit_501c3">501(c)(3) Nonprofit</option>
              <option value="llc">Small Business (LLC)</option>
              <option value="corporation">Corporation</option>
              <option value="sole_prop">Sole Proprietorship</option>
            </select>
          </div>
          <div>
            <Label>Annual Budget ($)</Label>
            <Input
              type="number"
              placeholder="250000"
              value={form.annualBudget}
              onChange={(e) => setForm({ ...form, annualBudget: e.target.value })}
            />
          </div>
          <div>
            <Label>State</Label>
            <Input
              placeholder="CA"
              maxLength={2}
              value={form.state}
              onChange={(e) =>
                setForm({ ...form, state: e.target.value.toUpperCase() })
              }
            />
          </div>
          <div>
            <Label>Mission / Focus Area</Label>
            <Input
              placeholder="Youth education, STEM programs"
              value={form.missionArea}
              onChange={(e) => setForm({ ...form, missionArea: e.target.value })}
            />
          </div>
          <Button
            onClick={calculate}
            disabled={loading}
            className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white"
          >
            {loading ? "Analyzing..." : "Calculate My Funding Gap"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="mt-6 border-brand-teal/30 bg-brand-teal/5">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-sm text-warm-500">You may be missing up to</p>
            <p className="text-4xl font-bold text-brand-teal">
              ${(result.estimatedMissedFunding / 1000).toFixed(0)}K
            </p>
            <p className="text-sm text-warm-500">
              in available grant funding across {result.totalMatches} potential grants
            </p>
            {result.topCategories?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-warm-700 dark:text-warm-300 mb-2">
                  Top categories for you:
                </p>
                {result.topCategories.map((c) => (
                  <span
                    key={c.category}
                    className="inline-block px-3 py-1 m-1 text-xs rounded-full bg-warm-100 dark:bg-warm-800 text-warm-700 dark:text-warm-300"
                  >
                    {c.category} ({c.count})
                  </span>
                ))}
              </div>
            )}
            <Button
              className="mt-4 bg-brand-teal hover:bg-brand-teal-dark text-white"
              render={<Link href="/signup">See All Your Matches — Free</Link>}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
