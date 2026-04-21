// src/components/marketing/grant-marquee.tsx
//
// Scrolling ribbon of real, live grants. Each card now has a
// category-keyed Unsplash photo header + grant details + Apply Now.
// Links to /grants/[id] (public detail page), not /signup — the
// signup gate happens on the "Start Applying" button of that page.

import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { Calendar, ArrowRight } from "lucide-react";
import { grantImageUrl } from "@/lib/grants/imagery";

type MarqueeGrant = {
  id: string;
  name: string;
  funder_name: string;
  amount_max: number | null;
  deadline: string | null;
  source_type: string | null;
  category: string | null;
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
  const imageUrl = grantImageUrl(grant.id, grant.source_type, grant.category);

  return (
    <Link
      href={`/grant/${grant.id}`}
      className="shrink-0 w-72 rounded-xl overflow-hidden border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 mx-3 hover:border-brand-teal/40 hover:shadow-md transition-[border-color,box-shadow] duration-200 group/card"
    >
      {/* Image header */}
      <div className="relative h-36 w-full overflow-hidden bg-warm-100 dark:bg-warm-800">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="288px"
          className="object-cover group-hover/card:scale-[1.02] transition-transform duration-500"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"
        />
        <span
          className={`absolute top-3 left-3 text-xs font-medium px-2 py-0.5 rounded-full ${chip.className}`}
        >
          {chip.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-sm font-semibold text-warm-900 dark:text-warm-50 leading-snug line-clamp-2 min-h-[2.5rem] flex-1">
            {grant.name}
          </h3>
          <span className="text-sm font-bold text-warm-900 dark:text-warm-50 tabular-nums shrink-0">
            {formatAmount(grant.amount_max)}
          </span>
        </div>
        <p className="text-xs text-warm-500 truncate">{grant.funder_name}</p>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-warm-100 dark:border-warm-800">
          <div className="flex items-center gap-1.5 text-xs text-warm-600 dark:text-warm-400">
            <Calendar className="h-3 w-3 text-brand-teal" aria-hidden="true" />
            {formatDeadline(grant.deadline)}
          </div>
          <span className="text-xs font-semibold text-brand-teal-text group-hover/card:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
            Apply now →
          </span>
        </div>
      </div>
    </Link>
  );
}

export async function GrantMarquee() {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data } = await admin
    .from("grant_sources")
    .select(
      "id, name, funder_name, amount_max, deadline, source_type, category"
    )
    .eq("is_active", true)
    .eq("status", "open")
    .or(`deadline.gte.${now},deadline.is.null`)
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(14);

  const grants = (data ?? []) as MarqueeGrant[];
  if (grants.length < 6) return null;

  const doubled = [...grants, ...grants];

  return (
    <section
      aria-label="Live grant ticker"
      className="relative py-10 overflow-hidden bg-warm-50 dark:bg-warm-900/30 border-y border-warm-200 dark:border-warm-800"
    >
      <div className="flex items-center justify-between max-w-6xl mx-auto px-4 mb-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2" aria-hidden="true">
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

      <div className="relative">
        <div
          className="flex w-max marquee-scroll motion-reduce:!animate-none"
          style={{ animationDuration: `${grants.length * 6}s` }}
        >
          {doubled.map((grant, i) => (
            <GrantCard key={`${grant.id}-${i}`} grant={grant} />
          ))}
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-warm-50 dark:from-warm-900/30 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-warm-50 dark:from-warm-900/30 to-transparent"
        />
      </div>
    </section>
  );
}
