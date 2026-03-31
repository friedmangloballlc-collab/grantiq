"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, Copy, Check, AlertCircle, FileText, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useOrg } from "@/hooks/use-org";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface LOIResult {
  loi_id: string | null;
  loi_text: string;
  word_count: number;
  subject_line: string;
  key_themes: string[];
}

export default function GrantLOIPage({ params }: PageProps) {
  const { id: grantId } = use(params);
  const { orgId } = useOrg();

  const [projectSummary, setProjectSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LOIResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if Stripe is configured by attempting to read from env via a lightweight check
    // We check the public env var pattern — if NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set and non-placeholder, Stripe is live
    const pubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
    const configured = pubKey.startsWith("pk_") && pubKey !== "pk_test_xxx" && pubKey.length > 20;
    setStripeConfigured(configured);
  }, []);

  async function handleGenerate() {
    if (projectSummary.trim().length < 20) {
      setError("Please enter at least 20 characters describing your project.");
      return;
    }

    // If Stripe is configured, we'd initiate a Stripe checkout here before generating.
    // For now, if Stripe IS configured we show an error to prevent free generation.
    if (stripeConfigured) {
      setError("Payment processing is required. Please use the checkout flow.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/writing/generate-loi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_source_id: grantId,
          project_summary: projectSummary,
          org_id: orgId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Generation failed. Please try again.");
      }

      setResult(data as LOIResult);
      setEditedText(data.loi_text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([editedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LOI-${grantId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-6 py-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link
          href={`/grants/${grantId}`}
          className="flex items-center gap-1 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Grant Details
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-[var(--color-brand-teal)]" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Letter of Intent — $49
          </span>
        </div>
        <h1 className="text-2xl font-bold">Write Letter of Intent</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI generates a professional 1-page LOI in seconds. Review, edit, and
          copy or download.
        </p>
      </div>

      {!result ? (
        /* ── Input form ── */
        <Card className="border-warm-200 dark:border-warm-800">
          <CardHeader>
            <CardTitle className="text-base">Project Summary</CardTitle>
            <CardDescription>
              Briefly describe your proposed project — what you&apos;ll do, who
              you&apos;ll serve, and the expected outcome. The AI will write the
              full letter.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Example: We propose a 12-month workforce development program serving 150 returning citizens in Atlanta, providing job-readiness training, employer partnerships, and 90-day post-placement support. Our goal is a 70% placement rate in jobs paying $18+/hr."
              className="min-h-36"
              value={projectSummary}
              onChange={(e) => setProjectSummary(e.target.value)}
            />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{projectSummary.length} characters</span>
              <span className="text-[var(--color-brand-teal)] font-medium">
                Your org profile auto-fills the intro
              </span>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {stripeConfigured === false && (
              <div className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 text-blue-800 dark:text-blue-200">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                Payment setup coming soon — LOI generation is free during beta.
              </div>
            )}

            <Button
              size="lg"
              className="w-full bg-[var(--color-brand-teal)] hover:bg-[var(--color-brand-teal)]/90 text-white"
              onClick={handleGenerate}
              disabled={loading || stripeConfigured === null}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating LOI…
                </>
              ) : stripeConfigured ? (
                "Generate LOI — $49"
              ) : (
                "Generate LOI (Beta — Free)"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {stripeConfigured
                ? "Payment charged once. Output is yours to edit and submit."
                : "Free during beta. Payment will be required after launch."}
            </p>
          </CardContent>
        </Card>
      ) : (
        /* ── Result / editor ── */
        <div className="space-y-6">
          {/* Meta */}
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 font-medium">
              {result.word_count} words
            </span>
            {result.key_themes.map((theme) => (
              <span
                key={theme}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-warm-100 text-warm-700 dark:bg-warm-800 dark:text-warm-300"
              >
                {theme}
              </span>
            ))}
          </div>

          {/* Subject line */}
          <div className="p-3 bg-warm-50 dark:bg-warm-800/30 border border-warm-200 dark:border-warm-700 rounded-lg">
            <p className="text-xs text-warm-500 mb-1">Suggested subject line</p>
            <p className="text-sm font-medium text-warm-900 dark:text-warm-50">
              {result.subject_line}
            </p>
          </div>

          {/* Editable text */}
          <div>
            <p className="text-sm font-medium text-warm-900 dark:text-warm-50 mb-2">
              Your LOI — edit before sending
            </p>
            <Textarea
              className="min-h-[480px] font-mono text-sm leading-relaxed"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleDownload}
            >
              <FileText className="h-4 w-4" />
              Download .txt
            </Button>

            <Button
              variant="outline"
              className="ml-auto text-muted-foreground"
              onClick={() => {
                setResult(null);
                setEditedText("");
              }}
            >
              Generate New Version
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
