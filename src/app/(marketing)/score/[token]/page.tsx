import Link from "next/link";
import type { Metadata } from "next";

interface ScorePageProps {
  params: Promise<{ token: string }>;
}

interface ScorePayload {
  score: number;
  org: string;
  ref?: string;
}

function parseToken(token: string): ScorePayload | null {
  try {
    const decoded = Buffer.from(decodeURIComponent(token), "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as ScorePayload;
    if (typeof parsed.score !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function getTierLabel(score: number): {
  label: string;
  color: string;
  bgColor: string;
  ringColor: string;
} {
  if (score >= 80)
    return {
      label: "Excellent",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
      ringColor: "stroke-emerald-500",
    };
  if (score >= 60)
    return {
      label: "Good",
      color: "text-brand-teal",
      bgColor: "bg-teal-50 dark:bg-teal-950",
      ringColor: "stroke-brand-teal",
    };
  if (score >= 40)
    return {
      label: "Moderate",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950",
      ringColor: "stroke-amber-500",
    };
  return {
    label: "Not Ready",
    color: "text-red-500 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950",
    ringColor: "stroke-red-500",
  };
}

export async function generateMetadata({ params }: ScorePageProps): Promise<Metadata> {
  const { token } = await params;
  const payload = parseToken(token);
  if (!payload) return { title: "Grant Readiness Score | GrantAQ" };
  const { label } = getTierLabel(payload.score);
  const desc = `${payload.org} scored ${payload.score}/100 for Grant Readiness (${label}). Get your own free Grant Readiness Score from GrantAQ.`;
  return {
    title: `${payload.org} — ${payload.score}/100 Grant Readiness | GrantAQ`,
    description: desc,
    openGraph: {
      title: `${payload.org} scored ${payload.score}/100 for Grant Readiness`,
      description: desc,
    },
    twitter: {
      card: "summary",
      title: `${payload.org} scored ${payload.score}/100 for Grant Readiness`,
      description: desc,
    },
  };
}

// Simple SVG score ring
function ScoreRing({
  score,
  ringColor,
}: {
  score: number;
  ringColor: string;
}) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="rotate-[-90deg]">
      {/* Track */}
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        className="stroke-warm-200 dark:stroke-warm-700"
        strokeWidth="12"
      />
      {/* Progress */}
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        className={ringColor}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

export default async function ScoreSharePage({ params }: ScorePageProps) {
  const { token } = await params;
  const payload = parseToken(token);

  const signupHref = payload?.ref ? `/signup?ref=${payload.ref}` : "/signup";

  if (!payload) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md space-y-4">
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Link expired</h1>
          <p className="text-sm text-warm-500">This share link is no longer valid.</p>
          <Link
            href={signupHref}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-teal px-6 text-sm font-medium text-white hover:bg-brand-teal/90 transition-colors"
          >
            Get Your Free Grant Readiness Score
          </Link>
        </div>
      </main>
    );
  }

  const tier = getTierLabel(payload.score);

  // Fake breakdown items to show blurred
  const fakeBreakdown = [
    { label: "Annual Budget", score: 8 },
    { label: "Grant History", score: 6 },
    { label: "Entity Status", score: 9 },
    { label: "Federal Readiness (SAM.gov)", score: 4 },
    { label: "Program Clarity", score: 7 },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-warm-50 to-white dark:from-warm-950 dark:to-warm-900 flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full space-y-8">
        {/* Score card */}
        <div
          className={`rounded-2xl border border-warm-200 dark:border-warm-800 ${tier.bgColor} p-8 text-center space-y-4`}
        >
          <p className="text-sm font-medium text-warm-500 uppercase tracking-wider">
            Grant Readiness Score
          </p>

          {/* Score ring */}
          <div className="relative inline-flex items-center justify-center">
            <ScoreRing score={payload.score} ringColor={tier.ringColor} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${tier.color}`}>{payload.score}</span>
              <span className="text-xs text-warm-400">/100</span>
            </div>
          </div>

          <div>
            <p className={`text-xl font-bold ${tier.color}`}>{tier.label}</p>
            <p className="text-sm text-warm-600 dark:text-warm-300 mt-1">
              {payload.org}
            </p>
          </div>
        </div>

        {/* Blurred breakdown */}
        <div className="relative rounded-2xl border border-warm-200 dark:border-warm-800 overflow-hidden">
          <div className="p-6 space-y-3 blur-sm pointer-events-none select-none" aria-hidden>
            <p className="text-sm font-semibold text-warm-700 dark:text-warm-300">
              Score Breakdown (10 criteria)
            </p>
            {fakeBreakdown.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex-1 text-sm text-warm-600 dark:text-warm-400">{item.label}</div>
                <div className="w-20 h-2 rounded-full bg-warm-200 dark:bg-warm-700 overflow-hidden">
                  <div
                    className="h-full bg-brand-teal rounded-full"
                    style={{ width: `${item.score * 10}%` }}
                  />
                </div>
                <span className="text-xs text-warm-500 w-8 text-right">{item.score}/10</span>
              </div>
            ))}
          </div>

          {/* Unlock overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-warm-900/70 backdrop-blur-[2px]">
            <div className="text-center px-6 space-y-3">
              <p className="text-base font-semibold text-warm-900 dark:text-warm-50">
                Full breakdown is private
              </p>
              <p className="text-sm text-warm-500">
                Sign up free to see all 10 criteria and your personalized improvement plan.
              </p>
              <Link
                href={signupHref}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-teal px-6 text-sm font-semibold text-white hover:bg-brand-teal/90 transition-colors"
              >
                Get Your Free Score
              </Link>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-2">
          <p className="text-sm text-warm-500">Ready to improve your grant readiness?</p>
          <Link
            href={signupHref}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-teal px-8 text-sm font-semibold text-white hover:bg-brand-teal/90 transition-colors shadow-lg shadow-brand-teal/20"
          >
            Get Your Free Grant Readiness Score
          </Link>
        </div>
      </div>
    </main>
  );
}
