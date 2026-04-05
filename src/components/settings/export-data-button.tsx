"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";

export function ExportDataButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch("/api/account/export");

      if (res.status === 429) {
        const data = await res.json();
        toast.error(data.error ?? "Export limit reached. Try again tomorrow.");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to export data. Please try again.");
        return;
      }

      // Trigger a browser download from the JSON blob
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ??
        `grantiq-data-export-${new Date().toISOString().split("T")[0]}.json`;

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);

      toast.success("Your data export has started downloading.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" disabled={loading} onClick={handleExport}>
      <DownloadIcon />
      {loading ? "Preparing export..." : "Download my data"}
    </Button>
  );
}
