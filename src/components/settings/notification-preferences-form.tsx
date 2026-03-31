"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type DigestFrequency = "daily" | "weekly" | "biweekly" | "off";

const FREQUENCY_OPTIONS: Array<{ value: DigestFrequency; label: string; description: string }> = [
  { value: "daily", label: "Daily", description: "Get a digest every morning" },
  { value: "weekly", label: "Weekly", description: "Every Monday — recommended" },
  { value: "biweekly", label: "Biweekly", description: "Every other week" },
  { value: "off", label: "Off", description: "No digest emails" },
];

interface NotificationPrefs {
  digest_frequency: DigestFrequency;
  alert_new_matches_above_score: number;
  alert_deadline_days_before: number;
  alert_pipeline_stale_days: number;
}

interface NotificationPreferencesFormProps {
  initialPrefs: NotificationPrefs;
}

export function NotificationPreferencesForm({ initialPrefs }: NotificationPreferencesFormProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="notifications" onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-warm-200 dark:border-warm-800">
        <CardHeader>
          <CardTitle className="text-base">Digest Emails</CardTitle>
          <CardDescription>
            Personalized weekly summaries of new grant matches, upcoming deadlines, and your next recommended action.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Digest Frequency</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("digest_frequency", opt.value)}
                  className={[
                    "flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    prefs.digest_frequency === opt.value
                      ? "border-[var(--color-brand-teal)] bg-[var(--color-brand-teal)]/10 font-semibold text-[var(--color-brand-teal)]"
                      : "border-border text-muted-foreground hover:border-muted-foreground",
                  ].join(" ")}
                >
                  <span className="font-medium text-foreground">{opt.label}</span>
                  <span className="text-xs">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-warm-200 dark:border-warm-800">
        <CardHeader>
          <CardTitle className="text-base">Alert Thresholds</CardTitle>
          <CardDescription>
            Control which events trigger in-app and email alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="match_score">New match alerts — minimum score</Label>
              <span className="text-sm font-semibold text-[var(--color-brand-teal)]">
                {prefs.alert_new_matches_above_score}%
              </span>
            </div>
            <input
              id="match_score"
              type="range"
              min={50}
              max={100}
              step={5}
              value={prefs.alert_new_matches_above_score}
              onChange={(e) => update("alert_new_matches_above_score", Number(e.target.value))}
              className="w-full accent-[var(--color-brand-teal)]"
            />
            <p className="text-xs text-muted-foreground">
              Only include grant matches at or above this score in your digest and alerts.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="deadline_days">Deadline alert window</Label>
              <span className="text-sm font-semibold text-[var(--color-brand-teal)]">
                {prefs.alert_deadline_days_before} days before
              </span>
            </div>
            <input
              id="deadline_days"
              type="range"
              min={3}
              max={30}
              step={1}
              value={prefs.alert_deadline_days_before}
              onChange={(e) => update("alert_deadline_days_before", Number(e.target.value))}
              className="w-full accent-[var(--color-brand-teal)]"
            />
            <p className="text-xs text-muted-foreground">
              Start showing upcoming deadlines this many days in advance.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="stale_days">Pipeline stale alert</Label>
              <span className="text-sm font-semibold text-[var(--color-brand-teal)]">
                {prefs.alert_pipeline_stale_days} days idle
              </span>
            </div>
            <input
              id="stale_days"
              type="range"
              min={3}
              max={30}
              step={1}
              value={prefs.alert_pipeline_stale_days}
              onChange={(e) => update("alert_pipeline_stale_days", Number(e.target.value))}
              className="w-full accent-[var(--color-brand-teal)]"
            />
            <p className="text-xs text-muted-foreground">
              Flag a pipeline application as stale if it hasn&apos;t been updated in this many days.
            </p>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Preferences"}
        </Button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400">Saved!</span>
        )}
      </div>
    </form>
  );
}
