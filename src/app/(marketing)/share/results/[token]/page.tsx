import Link from "next/link";
import type { Metadata } from "next";

interface ShareResultsPageProps {
  params: Promise<{ token: string }>;
}

interface SharePayload {
  count: number;
  value: number;
  org: string;
  ref?: string;
}

function parseToken(token: string): SharePayload | null {
  try {
    const decoded = Buffer.from(decodeURIComponent(token), "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as SharePayload;
    if (typeof parsed.count !== "number" || typeof parsed.value !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

export async function generateMetadata({ params }: ShareResultsPageProps): Promise<Metadata> {
  const { token } = await params;
  const payload = parseToken(token);
  if (!payload) {
    return { title: "Grant Match Results | GrantIQ" };
  }
  const desc = `GrantIQ found ${payload.count} grants worth ${formatValue(payload.value)} for ${payload.org}. Get your own AI-powered grant matches — free.`;
  const imageUrl = `/api/share/match-card?count=${payload.count}&value=${payload.value}&org=${encodeURIComponent(payload.org)}`;
  return {
    title: `${payload.count} Grants Found for ${payload.org} | GrantIQ`,
    description: desc,
    openGraph: {
      title: `GrantIQ found ${payload.count} grants for ${payload.org}`,
      description: desc,
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `GrantIQ found ${payload.count} grants for ${payload.org}`,
      description: desc,
      images: [imageUrl],
    },
  };
}

export default async function ShareResultsPage({ params }: ShareResultsPageProps) {
  const { token } = await params;
  const payload = parseToken(token);

  const signupHref = payload?.ref
    ? `/signup?ref=${payload.ref}`
    : "/signup";

  if (!payload) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md space-y-4">
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Link expired</h1>
          <p className="text-sm text-warm-500">This share link is no longer valid.</p>
          <Link
            href="/signup"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-teal px-6 text-sm font-medium text-white hover:bg-brand-teal/90 transition-colors"
          >
            Get Your Free Grant Matches
          </Link>
        </div>
      </main>
    );
  }

  const imageUrl = `/api/share/match-card?count=${payload.count}&value=${payload.value}&org=${encodeURIComponent(payload.org)}`;

  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-50 to-white dark:from-teal-950 dark:to-warm-900 flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full space-y-8">
        {/* OG card preview */}
        <div className="rounded-2xl overflow-hidden shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`GrantIQ found ${payload.count} grants for ${payload.org}`}
            className="w-full"
            width={1200}
            height={630}
          />
        </div>

        {/* Headline */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-warm-900 dark:text-warm-50 tracking-tight">
            GrantIQ found{" "}
            <span className="text-brand-teal">{payload.count} grants</span> worth{" "}
            <span className="text-brand-teal">{formatValue(payload.value)}</span>
          </h1>
          <p className="text-warm-500 text-lg">
            for <span className="font-medium text-warm-700 dark:text-warm-300">{payload.org}</span>
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4">
          <Link
            href={signupHref}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-teal px-8 text-base font-semibold text-white hover:bg-brand-teal/90 transition-colors shadow-lg shadow-brand-teal/20"
          >
            Get Your Own Grant Matches — Free
          </Link>
          <p className="text-xs text-warm-400">
            No credit card required. AI-powered matching in minutes.
          </p>
        </div>

        {/* Social proof */}
        <div className="border border-warm-200 dark:border-warm-800 rounded-xl p-5 text-center space-y-1">
          <p className="text-sm font-medium text-warm-700 dark:text-warm-300">
            Already used by nonprofits, small businesses, and government agencies
          </p>
          <p className="text-xs text-warm-400">
            Powered by Friedman Global&apos;s grant consulting playbooks
          </p>
        </div>
      </div>
    </main>
  );
}
