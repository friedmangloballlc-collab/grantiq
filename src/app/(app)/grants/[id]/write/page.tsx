"use client";

import { useState, use } from "react";
import { useOrg } from "@/hooks/use-org";
import { TIER_ORDER } from "@/components/shared/upgrade-gate";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Check, Upload, FileText, Loader2, AlertCircle, Calculator } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Tier definitions ────────────────────────────────────────────────────────

type TierKey = "tier1_ai_only" | "tier2_ai_audit" | "tier3_expert";

interface TierDef {
  key: TierKey;
  label: string;
  tagline: string;
  price: string;
  turnaround: string;
  features: string[];
  highlight?: boolean;
}

const TIERS: TierDef[] = [
  {
    key: "tier1_ai_only",
    label: "AI-Assisted",
    tagline: "Complete first draft in 30 minutes",
    price: "$149",
    turnaround: "~30 min",
    features: [
      "RFP analysis & funder research",
      "Full narrative draft (all sections)",
      "Budget table generation",
      "Compliance checklist",
      "Copy-ready output",
    ],
  },
  {
    key: "tier2_ai_audit",
    label: "Professional",
    tagline: "AI draft + expert audit + rewrite",
    price: "$749",
    turnaround: "~1 hour",
    highlight: true,
    features: [
      "Everything in AI-Assisted",
      "Expert-level AI audit pass",
      "Section-by-section rewrite",
      "Persuasion & clarity scoring",
      "Reviewer-perspective feedback",
    ],
  },
  {
    key: "tier3_expert",
    label: "Full Confidence",
    tagline: "$1,749 flat — or $0 + 10% success fee",
    price: "$1,749",
    turnaround: "24-48 hours",
    features: [
      "Everything in Professional",
      "Mock review panel simulation",
      "Compliance deep-check",
      "Risk flag analysis",
      "Success fee option available",
    ],
  },
];

// ─── Main page ────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GrantWritePage({ params }: PageProps) {
  const { id: grantId } = use(params);
  const { orgId, tier, isAdmin } = useOrg();
  const router = useRouter();

  // ALL hooks must be declared before any conditional returns (Rules of Hooks)
  const [selectedTier, setSelectedTier] = useState<TierKey | null>(null);
  const [rfpText, setRfpText] = useState("");
  const [rfpFile, setRfpFile] = useState<File | null>(null);
  const [rfpMode, setRfpMode] = useState<"paste" | "upload">("paste");
  const [step, setStep] = useState<"select" | "rfp" | "processing">("select");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Gate: Free and Starter users cannot access AI Writing (AFTER all hooks).
  // Admin users bypass — server-side enforcement still applies in /api/writing/purchase.
  if (!isAdmin && TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf("growth")) {
    return (
      <div className="px-6 py-8 max-w-5xl">
        <div className="mb-8">
          <p className="text-xs text-muted-foreground mb-1">Grant Application</p>
          <h1 className="text-2xl font-bold">Start Application</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center border border-warm-200 dark:border-warm-800 rounded-xl bg-warm-50 dark:bg-warm-900/30">
          <p className="text-lg font-semibold text-warm-900 dark:text-warm-50">
            AI Writing is an Applicant feature
          </p>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Upgrade to Applicant to access AI-powered grant writing, including full narrative drafts, budget tables, and compliance checklists.
          </p>
          <Button
            className="mt-6 bg-[var(--color-brand-teal)] text-white hover:bg-[var(--color-brand-teal)]/90"
            render={<Link href="/upgrade">Upgrade to Applicant</Link>}
          />
        </div>
      </div>
    );
  }

  // ─── Step 1 → 2 ────────────────────────────────────────────────────────────

  function handleSelectTier(tier: TierKey) {
    setSelectedTier(tier);
    setStep("rfp");
    setError(null);
  }

  // ─── Upload RFP ────────────────────────────────────────────────────────────

  async function uploadRfp(): Promise<string | null> {
    if (rfpMode === "upload" && rfpFile) {
      const formData = new FormData();
      formData.append("file", rfpFile);
      formData.append("org_id", orgId);
      formData.append("grant_source_id", grantId);

      const res = await fetch("/api/writing/upload-rfp", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to upload RFP");
      }

      const data = await res.json();
      return data.rfp_analysis_id ?? data.id;
    }

    // Text paste
    const res = await fetch("/api/writing/upload-rfp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_type: "text_paste",
        text: rfpText,
        org_id: orgId,
        grant_source_id: grantId,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to parse RFP");
    }

    const data = await res.json();
    return data.rfp_analysis_id ?? data.id;
  }

  // ─── Start writing ─────────────────────────────────────────────────────────

  async function handleStartWriting() {
    if (!selectedTier) return;

    const hasRfp =
      rfpMode === "paste" ? rfpText.trim().length >= 200 : rfpFile !== null;

    if (!hasRfp) {
      setError(
        rfpMode === "paste"
          ? "Please paste at least 200 characters of RFP text."
          : "Please select a PDF file."
      );
      return;
    }

    setUploading(true);
    setError(null);
    setStep("processing");

    try {
      const rfpAnalysisId = await uploadRfp();

      if (!rfpAnalysisId) {
        throw new Error("RFP upload did not return an analysis ID.");
      }

      // Purchase / create payment intent
      const purchaseRes = await fetch("/api/writing/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          rfp_analysis_id: rfpAnalysisId,
          tier: selectedTier,
          grant_type: "state_foundation", // default; could be derived from grant data
          grant_source_id: grantId,
        }),
      });

      const purchaseData = await purchaseRes.json();

      if (!purchaseRes.ok) {
        throw new Error(purchaseData.error ?? "Purchase failed.");
      }

      // Admin bypass OR Stripe-not-configured path. The purchase API set
      // client_secret=null because either:
      //   (a) admin_bypass=true — the user is in ADMIN_EMAILS and we
      //       skipped Stripe entirely. We must still kick off the
      //       writing pipeline by calling start-draft (no webhook will).
      //   (b) Stripe isn't configured — same handling, just skip
      //       start-draft and let the user land on a "payment pending"
      //       state.
      if (!purchaseData.client_secret) {
        if (purchaseData.admin_bypass) {
          const startRes = await fetch("/api/writing/start-draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draft_id: purchaseData.draft_id }),
          });
          if (!startRes.ok) {
            const startBody = await startRes.json().catch(() => ({}));
            throw new Error(startBody.error ?? "Failed to start admin draft");
          }
          router.push(`/writing/${purchaseData.draft_id}`);
        } else {
          router.push(`/writing/${purchaseData.draft_id}?payment=pending`);
        }
        return;
      }

      // Stripe checkout: redirect to hosted checkout page
      // For now, since Stripe keys are placeholders, handle gracefully
      try {
        const { loadStripe } = await import("@stripe/stripe-js").catch(() => {
          throw new Error("stripe_not_configured");
        });

        const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!stripeKey || stripeKey.startsWith("pk_placeholder")) {
          throw new Error("stripe_not_configured");
        }

        const stripe = await loadStripe(stripeKey);
        if (!stripe) throw new Error("stripe_not_configured");

        const { error: stripeError } = await stripe.confirmPayment({
          clientSecret: purchaseData.client_secret,
          confirmParams: {
            return_url: `${window.location.origin}/writing/${purchaseData.draft_id}`,
          },
        });

        if (stripeError) {
          throw new Error(stripeError.message ?? "Payment failed");
        }
      } catch (stripeErr: unknown) {
        const msg =
          stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
        if (msg === "stripe_not_configured") {
          // Stripe not configured — redirect to draft with pending payment status
          router.push(`/writing/${purchaseData.draft_id}?payment=pending`);
          return;
        }
        throw stripeErr;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStep("rfp");
    } finally {
      setUploading(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="px-6 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted-foreground mb-1">Grant Application</p>
        <h1 className="text-2xl font-bold">Start Application</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a writing tier, provide the RFP, and our AI will generate your
          application.
        </p>
      </div>

      {/* Build Budget nudge */}
      <div className="mb-6 flex items-center gap-3 p-3 rounded-lg bg-warm-50 dark:bg-warm-800/30 border border-warm-200 dark:border-warm-700">
        <Calculator className="h-4 w-4 text-brand-teal shrink-0" />
        <p className="text-sm text-warm-600 dark:text-warm-400 flex-1">
          Need a budget? Use the Budget Builder to create a line-item budget and AI-generated narrative.
        </p>
        <Link
          href={`/grants/${grantId}/budget`}
          className="shrink-0 text-xs font-medium text-brand-teal hover:underline"
        >
          Build Budget →
        </Link>
      </div>

      {/* Step 1 — Tier selection */}
      {(step === "select" || step === "rfp") && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Step 1 — Choose Your Tier
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {TIERS.map((tier) => (
              <TierCard
                key={tier.key}
                tier={tier}
                selected={selectedTier === tier.key}
                onSelect={() => handleSelectTier(tier.key)}
              />
            ))}
          </div>
        </>
      )}

      {/* Step 2 — RFP input */}
      {step === "rfp" && selectedTier && (
        <div className="mt-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Step 2 — Provide the RFP
          </h2>

          {/* Tab toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setRfpMode("paste")}
              className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
                rfpMode === "paste"
                  ? "bg-[var(--color-brand-teal)] text-white"
                  : "border border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              <FileText className="inline h-4 w-4 mr-1.5" />
              Paste Text
            </button>
            <button
              onClick={() => setRfpMode("upload")}
              className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
                rfpMode === "upload"
                  ? "bg-[var(--color-brand-teal)] text-white"
                  : "border border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              <Upload className="inline h-4 w-4 mr-1.5" />
              Upload PDF
            </button>
          </div>

          {rfpMode === "paste" ? (
            <Textarea
              placeholder="Paste the full RFP / grant guidelines here (minimum 200 characters)…"
              className="min-h-48 font-mono text-xs"
              value={rfpText}
              onChange={(e) => setRfpText(e.target.value)}
            />
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-accent/30 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              {rfpFile ? (
                <span className="text-sm font-medium">{rfpFile.name}</span>
              ) : (
                <>
                  <span className="text-sm font-medium">
                    Click to upload PDF
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Max 20MB
                  </span>
                </>
              )}
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setRfpFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <Button
              size="lg"
              className="bg-[var(--color-brand-teal)] hover:bg-[var(--color-brand-teal)]/90 text-white"
              onClick={handleStartWriting}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                "Start Writing"
              )}
            </Button>
            <button
              onClick={() => setStep("select")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Change tier
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Processing state */}
      {step === "processing" && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="h-10 w-10 text-[var(--color-brand-teal)] animate-spin mb-4" />
          <h2 className="text-lg font-semibold">Setting up your application…</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Parsing RFP and creating your writing project.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tier card component ──────────────────────────────────────────────────────

function TierCard({
  tier,
  selected,
  onSelect,
}: {
  tier: TierDef;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      className={`relative transition-all cursor-pointer ${
        selected
          ? "ring-2 ring-[var(--color-brand-teal)]"
          : tier.highlight
          ? "ring-2 ring-[var(--color-brand-teal)]/40"
          : ""
      }`}
    >
      {tier.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-brand-teal)] text-white text-xs font-semibold px-3 py-0.5 rounded-full">
          Most Popular
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-base">{tier.label}</CardTitle>
        <CardDescription>{tier.tagline}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{tier.price}</span>
          <span className="text-xs text-muted-foreground">/ application</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Turnaround: {tier.turnaround}
        </p>
        <ul className="space-y-2">
          {tier.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-[var(--color-brand-teal)] mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className={`w-full ${
            selected
              ? "bg-[var(--color-brand-teal)] text-white"
              : "bg-[var(--color-brand-teal)]/10 text-[var(--color-brand-teal)] hover:bg-[var(--color-brand-teal)]/20"
          }`}
          onClick={onSelect}
        >
          {selected ? "Selected" : "Select"}
        </Button>
      </CardFooter>
    </Card>
  );
}
