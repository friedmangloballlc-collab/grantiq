"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ENTITY_TYPES = [
  "Nonprofit 501(c)(3)",
  "Nonprofit 501(c)(4)",
  "Small Business",
  "Cooperative",
  "Government Agency",
  "Tribal Organization",
  "Educational Institution",
  "Other",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

export function AddClientForm() {
  const router = useRouter();

  const [orgName, setOrgName] = useState("");
  const [entityType, setEntityType] = useState("");
  const [state, setState] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [inviteClient, setInviteClient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!orgName.trim()) {
      setError("Organization name is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName, entityType, state, contactEmail, inviteClient }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create client.");
        return;
      }

      // Redirect to clients list after creation
      router.push("/clients");
      router.refresh();
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Basic information about the client organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Org Name */}
          <div className="space-y-1.5">
            <Label htmlFor="orgName">Organization Name *</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Nonprofit Foundation"
              required
            />
          </div>

          {/* Entity Type */}
          <div className="space-y-1.5">
            <Label htmlFor="entityType">Entity Type</Label>
            <select
              id="entityType"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors dark:bg-input/30"
            >
              <option value="">Select entity type…</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* State */}
          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <select
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors dark:bg-input/30"
            >
              <option value="">Select state…</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client Contact</CardTitle>
          <CardDescription>
            Optionally invite the client to view their own grant data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contact Email */}
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contact@clientorg.org"
            />
          </div>

          {/* Invite toggle */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={inviteClient}
              onChange={(e) => setInviteClient(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-[var(--color-brand-teal)]"
            />
            <div>
              <p className="text-sm font-medium text-foreground">Invite client to create a login</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                They will receive viewer-only access to their organization&apos;s data.
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={loading}
          className="bg-[var(--color-brand-teal)] hover:bg-[var(--color-brand-teal)]/90 text-white"
        >
          {loading ? "Creating…" : "Create Client"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/clients")}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
