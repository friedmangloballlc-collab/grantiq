// src/components/marketing/data-sources-cloud.tsx
//
// Trust strip: "Verified against" — real data sources GrantIQ pulls
// from nightly. Reinforces the "fresher than Candid" differentiator
// that our stats block and marquee already make.
//
// Uses text labels instead of hotlinked logos because:
// 1. Government data sources (IRS, SAM.gov, Grants.gov) don't have
//    brand SVGs we can legally reuse
// 2. Hotlinking external SVGs (svgl.app etc.) adds a network dependency
//    and can break silently if the URL changes
// 3. The labels are clearer than icons for this specific audience —
//    nonprofit EDs instantly recognize "IRS 990" in a way they might
//    not recognize a pictorial mark.

import { LogoCloud, type LogoCloudItem } from "@/components/ui/logo-cloud-3";

const DATA_SOURCES: LogoCloudItem[] = [
  { kind: "label", label: "Grants.gov" },
  { kind: "label", label: "SAM.gov" },
  { kind: "label", label: "IRS Exempt Org" },
  { kind: "label", label: "IRS 990 Filings" },
  { kind: "label", label: "Candid (cross-checked)" },
  { kind: "label", label: "NTEE Registry" },
  { kind: "label", label: "Foundation Center" },
  { kind: "label", label: "State Portals × 50" },
  { kind: "label", label: "CFDA" },
  { kind: "label", label: "NIH RePORTER" },
  { kind: "label", label: "NSF Awards" },
];

export function DataSourcesCloud() {
  return (
    <section className="py-14 px-4 border-y border-warm-200 dark:border-warm-800 bg-warm-50/50 dark:bg-warm-900/30">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm-600 dark:text-warm-400 text-center mb-5">
          Verified nightly against
        </p>
        <LogoCloud logos={DATA_SOURCES} speed={45} speedOnHover={90} />
      </div>
    </section>
  );
}
