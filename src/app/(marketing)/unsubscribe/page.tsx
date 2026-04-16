"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function UnsubscribePage() {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUnsubscribe() {
    setLoading(true);
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email") ?? "";
    try {
      await fetch("/api/services/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {}
    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">You&apos;ve been unsubscribed</h1>
        <p className="text-sm text-muted-foreground">You won&apos;t receive any more emails from us. Your account and data are unaffected.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <h1 className="text-xl font-bold mb-2">Unsubscribe from GrantAQ emails</h1>
      <p className="text-sm text-muted-foreground mb-6">Click below to stop receiving emails. Your account and data will not be affected.</p>
      <Button onClick={handleUnsubscribe} disabled={loading}>
        {loading ? "Processing..." : "Unsubscribe"}
      </Button>
    </div>
  );
}
