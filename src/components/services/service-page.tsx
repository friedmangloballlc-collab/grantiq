"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight, RefreshCw, CheckCircle2, Download } from "lucide-react";

interface ServicePageProps {
  serviceType: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  deliveryTime: string;
  price: string;
  additionalInputLabel?: string;
  additionalInputPlaceholder?: string;
  renderReport: (data: Record<string, unknown>) => React.ReactNode;
}

export function ServicePage({
  serviceType, title, description, icon, features, deliveryTime, price,
  additionalInputLabel, additionalInputPlaceholder, renderReport,
}: ServicePageProps) {
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [additionalInput, setAdditionalInput] = useState("");

  async function loadExisting() {
    try {
      const res = await fetch(`/api/services/orders?type=${serviceType}`);
      if (res.ok) {
        const data = await res.json();
        const latest = data.orders?.[0];
        if (latest?.report_data) setReport(latest.report_data);
      }
    } catch {} finally { setLoading(false); }
  }

  async function generate() {
    setGenerating(true); setError(null);
    try {
      const res = await fetch("/api/services/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_type: serviceType, additional_input: additionalInput || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Generation failed"); return; }
      setReport(data.report);
    } catch { setError("Something went wrong."); } finally { setGenerating(false); }
  }

  useEffect(() => { loadExisting(); }, []);

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">{title}</h1>
        <p className="text-sm text-warm-500 mt-1">{description}</p>
      </div>

      {!report ? (
        <Card className="mb-8">
          <CardContent className="py-10 text-center">
            <div className="mx-auto mb-4">{icon}</div>
            <h2 className="text-lg font-semibold mb-2">{title}</h2>
            <p className="text-sm text-muted-foreground mb-2 max-w-md mx-auto">{description}</p>
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {features.map((f) => (
                <span key={f} className="text-xs px-2 py-1 rounded-full bg-brand-teal/10 text-brand-teal">{f}</span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mb-4">{deliveryTime} &middot; {price}</p>

            {additionalInputLabel && (
              <div className="max-w-md mx-auto mb-4 text-left">
                <label className="text-sm font-medium">{additionalInputLabel}</label>
                <textarea
                  className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
                  rows={4}
                  value={additionalInput}
                  onChange={(e) => setAdditionalInput(e.target.value)}
                  placeholder={additionalInputPlaceholder}
                />
              </div>
            )}

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <Button onClick={generate} disabled={generating} size="lg" className="gap-2">
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <>Generate <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Your {title.toLowerCase()} is ready.</p>
          </div>

          {renderReport(report)}

          <div className="flex items-center justify-center gap-3 pt-4">
            <Button variant="outline" onClick={generate} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Render a JSON report as expandable sections */
export function JsonReportDisplay({ data, title }: { data: unknown; title?: string }) {
  if (!data) return null;
  if (typeof data === "string") return <p className="text-sm whitespace-pre-wrap">{data}</p>;
  if (Array.isArray(data)) {
    return (
      <div className="space-y-2">
        {data.map((item, i) => (
          <Card key={i}>
            <CardContent className="py-3">
              <JsonReportDisplay data={item} />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  if (typeof data === "object" && data !== null) {
    return (
      <div className="space-y-3">
        {Object.entries(data as Record<string, unknown>).map(([key, val]) => (
          <div key={key}>
            <h4 className="text-sm font-semibold capitalize mb-1">{key.replace(/_/g, " ")}</h4>
            {typeof val === "string" ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{val}</p>
            ) : Array.isArray(val) ? (
              <ul className="space-y-1 ml-4">
                {val.map((item, i) => (
                  <li key={i} className="text-sm">
                    {typeof item === "string" ? (
                      <span className="text-muted-foreground">{item}</span>
                    ) : (
                      <JsonReportDisplay data={item} />
                    )}
                  </li>
                ))}
              </ul>
            ) : typeof val === "number" ? (
              <p className="text-sm font-medium">{val}</p>
            ) : (
              <JsonReportDisplay data={val} />
            )}
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-sm">{String(data)}</p>;
}
