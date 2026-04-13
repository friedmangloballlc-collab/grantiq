"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

export function EnrichProfileButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleEnrich() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/enrich-profile", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to enrich profile");
        return;
      }

      if (data.fieldsUpdated > 0) {
        setResult(`Updated ${data.fieldsUpdated} field${data.fieldsUpdated > 1 ? "s" : ""} from your website. Refresh to see changes.`);
      } else {
        setResult("Your profile is already complete — no new data found on your website.");
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleEnrich}
        disabled={loading}
        variant="outline"
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {loading ? "Scanning website..." : "Auto-fill from website"}
      </Button>
      {result && (
        <p className="text-sm text-green-600 dark:text-green-400">{result}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
