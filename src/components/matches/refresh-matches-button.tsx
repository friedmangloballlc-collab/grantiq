"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";

export function RefreshMatchesButton({ orgId }: { orgId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleRefresh() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult(data.error ?? "Failed to refresh");
        return;
      }

      setResult(`Found ${data.total ?? 0} matches. Refreshing page...`);
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setResult("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleRefresh}
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      {loading ? "Refreshing..." : "Refresh Matches"}
    </Button>
  );
}
