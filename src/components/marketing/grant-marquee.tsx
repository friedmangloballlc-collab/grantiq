// src/components/marketing/grant-marquee.tsx
//
// Scrolling ribbon of real, live grants. This is the "prove we're not
// Candid 2.0" moment — fresh data, actual funder names, actual deadlines.
//
// Server component: queries grant_sources at request time, renders a
// CSS-only infinite marquee (no JS). The array is doubled so the
// loop seams are seamless.

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Calendar, ArrowRight } from "lucide-react";

type MarqueeGrant = {
  id: string;
  name: string;
  funder_name: string;
  amount_max: number | null;
  deadline: string | null;
  source_type: string | null;
};

function formatAmount(amount: number | null): string {
  if (!amount) return "Amount varies";
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount.toLocaleString()}`;
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "Rolling";
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return "Rolling";
  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "Rolling";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days < 30) return `Due in ${days} days`;
  return `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function sourceChip(type: string | null): {
  label: string;
  className: string;
} {
  switch (type) {
    case "federal":
      return {
        label: "Federal",
        className: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
      };
    case "state":
      return {
        label: "State",
        className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
      };
    case "foundation":
      return {
        label: "Foundation",
        className: "bg-brand-teal/10 text-brand-teal-text",
      };
    case "corporate":
      return {
        label: "Corporate",
        className: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
      };
    default:
      return {
        label: "Grant",
        className: "bg-warm-100 text-warm-700 dark:bg-warm-800 dark:text-warm-300",
      };
  }
}

function GrantCard({ grant }: { grant: MarqueeGrant }) {
  const chip = sourceChip(grant.source_type);
  return (
    <Link
      href={`/signup`}
      className="shrink-0 w-72 rounded-xl border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 p-5 mx-3 hover:border-brand-teal/40 hover:shadow-sm transition-[border-color,box-shadow] duration-200"
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${chip.className}`}
        >
          {chip.label}
        </span>
        <span className="text-sm font-semibold text-warm-900 dark:text-warm-50 tabular-nums">
          {formatAmount(grant.amount_max)}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-warm-900 dark:text-warm-50 leading-snug line-clamp-2 min-h-[2.5rem]">
        {grant.name}
      </h3>
      <p className="text-xs text-warm-500 mt-1 truncate">{grant.funder_name}</p>
      <div className="flex items-center gap-1.5 mt-3 text-xs text-warm-600 dark:text-warm-400">
        <Calendar className="h-3 w-3 text-brand-teal" aria-hidden="true" />
        {formatDeadline(grant.deadline)}
      </div>
    </Link>
  );
}

export async function GrantMarquee() {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Pull 14 active grants with upcoming deadlines. Prefer variety across
  // source_types so the marquee doesn't read as one category.
  const { data } = await admin
    .from("grant_sources")
    .select("id, name, funder_name, amount_max, deadline, source_type")
    .eq("is_active", true)
    .eq("status", "open")
    .or(`deadline.gte.${now},deadline.is.null`)
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(14);

  const grants = (data ?? []) as MarqueeGrant[];
  if (grants.length < 6) return null;

  // Duplicate so the loop is seamless (width: 200%, translateX -50%)
  const doubled = [...grants, ...grants];

  return (
    <section
      aria-label="Live grant ticker"
      className="relative py-8 overflow-hidden bg-warm-50 dark:bg-warm-900/30 border-y border-warm-200 dark:border-warm-800"
    >
      <div className="flex items-center justify-between max-w-6xl mx-auto px-4 mb-4">
        <div className="flex items-center gap-2">
          <span
            className="relative flex h-2 w-2"
            aria-hidden="true"
          >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-teal opacity-50"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-teal"></span>
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-warm-600 dark:text-warm-400">
            Live grants · verified nightly
          </p>
        </div>
        <Link
          href="/grant-directory"
          className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-brand-teal-text hover:underline"
        >
          Browse all
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      {/* Marquee track — width 200% so translating -50% produces one full loop */}
      <div className="relative">
        <div
          className="flex w-max marquee-scroll motion-reduce:!animate-none"
          style={{ animationDuration: `${grants.length * 5}s` }}
        >
          {doubled.map((grant, i) => (
            <GrantCard key={`${grant.id}-${i}`} grant={grant} />
          ))}
        </div>

        {/* Edge fade — mask the scroll seams so cards don't just pop in */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-warm-50 dark:from-warm-900/30 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-warm-50 dark:from-warm-900/30 to-transparent"
        />
      </div>
    </section>
  );
}
