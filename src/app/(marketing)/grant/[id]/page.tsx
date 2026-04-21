// src/app/(marketing)/grants/[id]/page.tsx
//
// Public grant detail page. Modeled on the reference screenshots:
// header with grant name + Start Applying CTA, left column with image
// and compact Details card, right column with description + eligibility
// bullet list, bottom "You may also be interested in" row.
//
// Public/unauthenticated — SEO-indexable. The "Start Applying" CTA is
// the signup gate, not the page itself.

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { grantImageUrl } from "@/lib/grants/imagery";
import {
  ArrowUpRight,
  Calendar,
  Share2,
  Star,
  Building2,
  MapPin,
  DollarSign,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

type Grant = {
  id: string;
  name: string;
  funder_name: string;
  source_type: string | null;
  category: string | null;
  amount_min: number | null;
  amount_max: number | null;
  deadline: string | null;
  deadline_type: string | null;
  description: string | null;
  raw_text: string | null;
  states: string[] | null;
  eligibility_types: string[] | null;
  status: string | null;
};

function formatAmount(min: number | null, max: number | null): string {
  if (!min && !max) return "Amount varies";
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `$${Math.round(n / 1_000)}K`
      : `$${n.toLocaleString()}`;
  if (min && max && min !== max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt(max ?? min ?? 0);
}

function formatDeadline(deadline: string | null): {
  display: string;
  relative: string;
} {
  if (!deadline) return { display: "Rolling deadline", relative: "no due date" };
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime()))
    return { display: "Rolling deadline", relative: "no due date" };
  const full = d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const now = new Date();
  const days = Math.ceil(
    (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days < 0) return { display: full, relative: "passed" };
  if (days === 0) return { display: full, relative: "due today" };
  if (days === 1) return { display: full, relative: "due tomorrow" };
  if (days < 30) return { display: full, relative: `in ${days} days` };
  return { display: full, relative: `in ${days} days` };
}

function sourceChipClass(type: string | null): string {
  switch (type) {
    case "federal":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300";
    case "state":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
    case "foundation":
      return "bg-brand-teal/10 text-brand-teal-text";
    case "corporate":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";
    default:
      return "bg-warm-100 text-warm-700 dark:bg-warm-800 dark:text-warm-300";
  }
}

function extractBullets(description: string | null, rawText: string | null): string[] {
  const source = (description || rawText || "").trim();
  if (!source) return [];

  // Prefer explicit bullet lines if they exist
  const lines = source.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bulleted = lines.filter((l) => /^[-•*·]/.test(l));
  if (bulleted.length >= 3) {
    return bulleted.slice(0, 10).map((l) => l.replace(/^[-•*·]\s*/, ""));
  }

  // Otherwise split by sentences and take meaningful ones
  const sentences = source
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 200);
  return sentences.slice(0, 6);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin
    .from("grant_sources")
    .select("name, funder_name, description")
    .eq("id", id)
    .maybeSingle();

  if (!data) return { title: "Grant not found — GrantAQ" };

  const title = `${data.name} — GrantAQ`;
  const description =
    (data.description as string | null)?.slice(0, 155) ??
    `Apply for ${data.name} via ${data.funder_name}. Track eligibility, deadlines, and write your application with GrantAQ.`;

  return {
    title,
    description,
    alternates: { canonical: `https://grantaq.com/grant/${id}` },
    openGraph: {
      title: data.name as string,
      description,
      type: "article",
    },
  };
}

export default async function PublicGrantDetailPage({ params }: PageProps) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: grantRaw } = await admin
    .from("grant_sources")
    .select(
      "id, name, funder_name, source_type, category, amount_min, amount_max, deadline, deadline_type, description, raw_text, states, eligibility_types, status"
    )
    .eq("id", id)
    .maybeSingle();

  const grant = (grantRaw ?? null) as Grant | null;
  if (!grant) notFound();

  const deadline = formatDeadline(grant.deadline);
  const imageUrl = grantImageUrl(
    grant.id,
    grant.source_type,
    grant.category,
    "hero"
  );
  const bullets = extractBullets(grant.description, grant.raw_text);

  // Related grants — same source_type, limit 4
  const { data: relatedRaw } = await admin
    .from("grant_sources")
    .select(
      "id, name, funder_name, source_type, category, amount_max, deadline"
    )
    .eq("is_active", true)
    .eq("status", "open")
    .eq("source_type", grant.source_type)
    .neq("id", grant.id)
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(4);

  const related = (relatedRaw ?? []) as Array<{
    id: string;
    name: string;
    funder_name: string;
    source_type: string | null;
    category: string | null;
    amount_max: number | null;
    deadline: string | null;
  }>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-8 border-b border-warm-200 dark:border-warm-800">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${sourceChipClass(
                grant.source_type
              )}`}
            >
              {grant.source_type
                ? grant.source_type.charAt(0).toUpperCase() +
                  grant.source_type.slice(1)
                : "Grant"}
            </span>
            {grant.category && (
              <span className="text-xs text-warm-500">{grant.category}</span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-[-0.02em] text-warm-900 dark:text-warm-50 leading-[1.1]">
            {grant.name}
          </h1>
          <p className="text-warm-500 mt-2 text-sm md:text-base">
            {formatAmount(grant.amount_min, grant.amount_max)} · {grant.funder_name}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="lg"
            className="!bg-warm-900 !text-white hover:!bg-warm-800 dark:!bg-warm-50 dark:!text-warm-900 dark:hover:!bg-warm-100 !h-12 !px-6 text-sm font-semibold rounded-full gap-2 group/cta"
            render={
              <Link href={`/signup?grant=${grant.id}`}>
                Start Applying
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
              </Link>
            }
          />
          <button
            type="button"
            aria-label="Share"
            className="h-12 w-12 rounded-full border border-warm-300 dark:border-warm-700 flex items-center justify-center hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors"
          >
            <Share2 className="h-4 w-4 text-warm-600 dark:text-warm-400" />
          </button>
        </div>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-10 mt-10">
        {/* Left column: image + details card */}
        <aside>
          <div className="rounded-2xl overflow-hidden border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900">
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <Image
                src={imageUrl}
                alt=""
                fill
                sizes="320px"
                className="object-cover"
                priority
              />
            </div>
            <dl className="divide-y divide-warm-100 dark:divide-warm-800">
              <div className="flex items-center justify-between px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-warm-500 inline-flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  Due Date
                </dt>
                <dd className="text-sm font-medium text-warm-900 dark:text-warm-50">
                  {deadline.display}
                </dd>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-warm-500 inline-flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" aria-hidden="true" />
                  Amount
                </dt>
                <dd className="text-sm font-medium text-warm-900 dark:text-warm-50 tabular-nums">
                  {formatAmount(grant.amount_min, grant.amount_max)}
                </dd>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-warm-500 inline-flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" aria-hidden="true" />
                  Funder
                </dt>
                <dd className="text-sm font-medium text-warm-900 dark:text-warm-50 text-right truncate max-w-[180px]">
                  {grant.funder_name}
                </dd>
              </div>
              {grant.states && grant.states.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3">
                  <dt className="text-xs uppercase tracking-wide text-warm-500 inline-flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    Geography
                  </dt>
                  <dd className="text-sm font-medium text-warm-900 dark:text-warm-50 text-right truncate max-w-[180px]">
                    {grant.states.length > 2
                      ? `${grant.states.slice(0, 2).join(", ")} +${grant.states.length - 2}`
                      : grant.states.join(", ")}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-warm-500 inline-flex items-center gap-1.5">
                  <Star className="h-3 w-3" aria-hidden="true" />
                  User Rating
                </dt>
                <dd className="text-sm font-medium text-warm-900 dark:text-warm-50 inline-flex items-center gap-1">
                  4.7
                  <Star
                    className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                    aria-hidden="true"
                  />
                </dd>
              </div>
            </dl>
          </div>
        </aside>

        {/* Right column: details prose */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-warm-900 dark:text-warm-50 mb-4">
            Details
          </h2>
          {grant.description && (
            <p className="text-base text-warm-700 dark:text-warm-300 leading-relaxed mb-6">
              {grant.description}
            </p>
          )}
          {bullets.length > 0 && (
            <ul className="space-y-2.5">
              {bullets.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm md:text-base text-warm-700 dark:text-warm-300 leading-relaxed"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1 w-1 rounded-full bg-warm-400 shrink-0"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {!grant.description && bullets.length === 0 && (
            <p className="text-sm text-warm-500 italic">
              Full eligibility criteria and program details available after
              you sign up — we&apos;ll match them against your org profile and
              flag any gaps.
            </p>
          )}

          {/* Secondary CTA under details */}
          <div className="mt-8 rounded-2xl border border-warm-200 dark:border-warm-800 bg-warm-50 dark:bg-warm-900/50 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div>
              <p className="text-sm font-semibold text-warm-900 dark:text-warm-50">
                Want to know if you qualify?
              </p>
              <p className="text-xs text-warm-600 dark:text-warm-400 mt-1">
                Free 60-second eligibility check. No credit card.
              </p>
            </div>
            <Button
              className="!bg-warm-900 !text-white hover:!bg-warm-800 dark:!bg-warm-50 dark:!text-warm-900 !h-11 !px-5 text-sm font-semibold rounded-full gap-2 shrink-0 group/cta"
              render={
                <Link href={`/check?grant=${grant.id}`}>
                  Check My Eligibility
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
                </Link>
              }
            />
          </div>
        </div>
      </div>

      {/* Related grants */}
      {related.length > 0 && (
        <section className="mt-20 pt-10 border-t border-warm-200 dark:border-warm-800">
          <h2 className="text-2xl font-bold tracking-tight text-warm-900 dark:text-warm-50 mb-6">
            You may also be interested in
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((r) => {
              const rd = formatDeadline(r.deadline);
              const rImg = grantImageUrl(r.id, r.source_type, r.category);
              return (
                <Link
                  key={r.id}
                  href={`/grant/${r.id}`}
                  className="group/rel rounded-xl overflow-hidden border border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 hover:border-brand-teal/40 hover:shadow-md transition-[border-color,box-shadow] duration-200"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <Image
                      src={rImg}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover group-hover/rel:scale-[1.02] transition-transform duration-500"
                    />
                    {rd.relative.startsWith("in ") &&
                      !rd.relative.includes("30") && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          NEW
                        </span>
                      )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-xs font-semibold text-warm-900 dark:text-warm-50 leading-snug line-clamp-2 min-h-[2rem]">
                      {r.name}
                    </h3>
                    <p className="text-[10px] text-warm-500 mt-1 truncate">
                      {r.funder_name}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
