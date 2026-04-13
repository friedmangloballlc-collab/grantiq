"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ENTITY_TYPES = [
  { value: "nonprofit_501c3", label: "501(c)(3) Nonprofit" },
  { value: "nonprofit_other", label: "Other Nonprofit" },
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation (S-Corp / C-Corp)" },
  { value: "sole_prop", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "municipality", label: "Government / Municipality" },
  { value: "other", label: "Other" },
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
];

interface OrgData {
  id?: string;
  name?: string;
  entity_type?: string;
  mission_statement?: string;
  mission?: string; // Legacy alias
  state?: string;
  city?: string;
  ein?: string;
  ein_encrypted?: string;
  website_url?: string;
  website?: string; // Legacy alias
  founded_year?: number;
  annual_budget?: number;
  employee_count?: number;
  industry?: string;
  userRole?: string;
}

interface OrgSettingsFormProps {
  org: OrgData | null;
}

export function OrgSettingsForm({ org }: OrgSettingsFormProps) {
  const [form, setForm] = useState({
    name: org?.name ?? "",
    entity_type: org?.entity_type ?? "",
    mission_statement: org?.mission_statement ?? org?.mission ?? "",
    state: org?.state ?? "",
    city: org?.city ?? "",
    website_url: org?.website_url ?? org?.website ?? "",
    founded_year: org?.founded_year?.toString() ?? "",
    annual_budget: org?.annual_budget?.toString() ?? "",
    employee_count: org?.employee_count?.toString() ?? "",
    industry: org?.industry ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = org?.userRole === "owner" || org?.userRole === "admin";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!org?.id) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/settings/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: org.id,
          ...form,
          founded_year: form.founded_year ? parseInt(form.founded_year) : null,
          annual_budget: form.annual_budget ? parseInt(form.annual_budget) : null,
        }),
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

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-warm-200 dark:border-warm-800">
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Acme Nonprofit Inc."
              disabled={!isAdmin}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entity_type">Entity Type</Label>
            <select
              id="entity_type"
              value={form.entity_type}
              onChange={(e) => update("entity_type", e.target.value)}
              disabled={!isAdmin}
              className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select entity type…</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mission">Mission Statement</Label>
            <Textarea
              id="mission"
              value={form.mission_statement}
              onChange={(e) => update("mission_statement", e.target.value)}
              placeholder="Describe your organization's mission and primary programs…"
              rows={4}
              disabled={!isAdmin}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-warm-200 dark:border-warm-800">
        <CardHeader>
          <CardTitle className="text-base">Location & Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <select
                id="state"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                disabled={!isAdmin}
                className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select state…</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="Atlanta"
                disabled={!isAdmin}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={form.website_url}
              onChange={(e) => update("website_url", e.target.value)}
              placeholder="https://example.org"
              type="url"
              disabled={!isAdmin}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="founded_year">Founded Year</Label>
              <Input
                id="founded_year"
                value={form.founded_year}
                onChange={(e) => update("founded_year", e.target.value)}
                placeholder="2015"
                type="number"
                min={1800}
                max={new Date().getFullYear()}
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="annual_budget">Annual Budget ($)</Label>
              <Input
                id="annual_budget"
                value={form.annual_budget}
                onChange={(e) => update("annual_budget", e.target.value)}
                placeholder="500000"
                type="number"
                min={0}
                disabled={!isAdmin}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {!isAdmin && (
        <p className="text-sm text-warm-500">
          Only org owners and admins can edit settings.
        </p>
      )}

      {isAdmin && (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400">Saved!</span>
          )}
        </div>
      )}
    </form>
  );
}
