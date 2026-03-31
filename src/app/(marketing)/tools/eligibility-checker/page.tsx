"use client";

import { useState } from "react";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const ENTITY_TYPES = [
  { value: "nonprofit_501c3", label: "501(c)(3) Nonprofit" },
  { value: "nonprofit_501c4", label: "501(c)(4) Social Welfare Org" },
  { value: "nonprofit_other", label: "Other Nonprofit" },
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation (S-Corp / C-Corp)" },
  { value: "sole_prop", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "tribal", label: "Tribal Organization" },
  { value: "government", label: "Government / Municipal" },
  { value: "education", label: "School / University" },
];

const GRANT_TYPES = [
  {
    name: "Federal Grants (Grants.gov)",
    eligible: ["nonprofit_501c3", "nonprofit_501c4", "nonprofit_other", "tribal", "government", "education"],
    description: "Federal agencies fund nonprofits, tribal orgs, governments, and educational institutions. Most require SAM.gov registration.",
  },
  {
    name: "SBA Small Business Grants",
    eligible: ["llc", "corporation", "sole_prop", "partnership"],
    description: "The Small Business Administration offers grants for research (SBIR/STTR), export assistance, and disaster recovery.",
  },
  {
    name: "Foundation Grants",
    eligible: ["nonprofit_501c3"],
    description: "Private and community foundations almost exclusively fund 501(c)(3) organizations. This is the largest category of philanthropic giving.",
  },
  {
    name: "Corporate Grants & CSR",
    eligible: ["nonprofit_501c3", "nonprofit_501c4", "nonprofit_other", "education"],
    description: "Major corporations fund nonprofits and schools through CSR programs. Some also offer small business innovation grants.",
  },
  {
    name: "State & Local Government Grants",
    eligible: ["nonprofit_501c3", "nonprofit_501c4", "nonprofit_other", "llc", "corporation", "tribal", "government", "education"],
    description: "State agencies distribute federal pass-through funds and state-funded grants to a wide range of entity types.",
  },
  {
    name: "SBIR / STTR Research Grants",
    eligible: ["llc", "corporation"],
    description: "Small Business Innovation Research grants fund technology R&D. Must be a US small business with fewer than 500 employees.",
  },
  {
    name: "Community Development Grants (CDBG)",
    eligible: ["nonprofit_501c3", "nonprofit_other", "government", "tribal"],
    description: "HUD Community Development Block Grants fund housing, infrastructure, and community services in low-income areas.",
  },
  {
    name: "USDA Rural Development Grants",
    eligible: ["nonprofit_501c3", "nonprofit_other", "llc", "corporation", "sole_prop", "tribal", "government"],
    description: "USDA offers grants for rural businesses, utilities, housing, and community facilities.",
  },
];

export default function EligibilityCheckerPage() {
  const [selected, setSelected] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const eligible = GRANT_TYPES.filter((g) => g.eligible.includes(selected));
  const ineligible = GRANT_TYPES.filter((g) => !g.eligible.includes(selected));

  return (
    <div className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-brand-teal/10 text-brand-teal mb-4">
            Free Tool
          </span>
          <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50">
            Grant Eligibility Checker
          </h1>
          <p className="text-warm-500 mt-2">
            Select your organization type to see which grant categories you qualify for.
          </p>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-2">
            What type of organization are you?
          </label>
          <select
            value={selected}
            onChange={(e) => { setSelected(e.target.value); setSubmitted(false); }}
            className="w-full rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 px-4 py-3 text-sm text-warm-900 dark:text-warm-50"
          >
            <option value="">Select your entity type...</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {selected && !submitted && (
          <div className="text-center">
            <Button
              onClick={() => setSubmitted(true)}
              className="bg-brand-teal hover:bg-brand-teal-dark text-white px-8"
            >
              Check My Eligibility
            </Button>
          </div>
        )}

        {submitted && selected && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <p className="text-4xl font-extrabold text-brand-teal">{eligible.length}</p>
              <p className="text-sm text-warm-500">grant categories you qualify for</p>
            </div>

            {eligible.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Eligible Grant Types
                </h2>
                <div className="space-y-3">
                  {eligible.map((g) => (
                    <div key={g.name} className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20 p-4">
                      <h3 className="text-sm font-semibold text-warm-900 dark:text-warm-50">{g.name}</h3>
                      <p className="text-xs text-warm-500 mt-1">{g.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ineligible.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-warm-400 mb-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4" /> Not Eligible For
                </h2>
                <div className="space-y-2">
                  {ineligible.map((g) => (
                    <div key={g.name} className="rounded-xl border border-warm-200 dark:border-warm-700 p-4 opacity-60">
                      <h3 className="text-sm font-medium text-warm-600 dark:text-warm-400">{g.name}</h3>
                      <p className="text-xs text-warm-400 mt-1">{g.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center pt-6">
              <p className="text-sm text-warm-500 mb-4">
                Want to see the specific grants you qualify for?
              </p>
              <Button
                className="bg-brand-teal hover:bg-brand-teal-dark text-white"
                render={
                  <Link href="/signup">
                    Get Personalized Matches <ArrowRight className="ml-2 h-4 w-4 inline" />
                  </Link>
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
