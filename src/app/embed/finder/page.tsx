"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const ENTITY_TYPES = [
  { value: "", label: "Select organization type..." },
  { value: "nonprofit_501c3", label: "501(c)(3) Nonprofit" },
  { value: "nonprofit_501c4", label: "501(c)(4) Social Welfare" },
  { value: "nonprofit_other", label: "Other Nonprofit" },
  { value: "llc", label: "Small Business (LLC)" },
  { value: "corporation", label: "Corporation" },
  { value: "sole_prop", label: "Sole Proprietorship" },
  { value: "other", label: "Other Organization" },
];

const INDUSTRIES = [
  { value: "", label: "Select industry / focus area..." },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "arts-culture", label: "Arts & Culture" },
  { value: "environment", label: "Environment" },
  { value: "technology", label: "Technology" },
  { value: "housing", label: "Housing & Community Development" },
  { value: "workforce", label: "Workforce Development" },
  { value: "youth", label: "Youth & Families" },
  { value: "veterans", label: "Veterans" },
  { value: "human-services", label: "Human Services" },
  { value: "food-agriculture", label: "Food & Agriculture" },
  { value: "public-safety", label: "Public Safety" },
  { value: "research", label: "Research & Science" },
  { value: "other", label: "Other" },
];

const US_STATES = [
  { value: "", label: "Select state..." },
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" }, { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" }, { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
];

interface MatchResult {
  matchCount: number;
  estimatedFunding: number;
  topCategories: Array<{ category: string; count: number }>;
}

function GrantFinderWidget() {
  const searchParams = useSearchParams();
  const partner = searchParams.get("partner") || "direct";

  const [form, setForm] = useState({ entityType: "", industry: "", state: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState("");

  const signupUrl = `https://grantiq-gold.vercel.app/signup?ref=${partner}`;

  const canSubmit = form.entityType && form.industry && form.state;

  const handleFind = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/embed/match-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: form.entityType,
          industry: form.industry,
          state: form.state,
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch matches");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatFunding = (amount: number) => {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div
      style={{
        fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "#fff",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: "480px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 15l-5 3.2 1.9-5.8L4 9.8h6.1z"/>
            </svg>
            <span style={{ fontSize: "16px", fontWeight: "700", color: "#1C1917" }}>GrantIQ</span>
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1C1917", margin: "0 0 6px" }}>
            Find Grants You Qualify For
          </h2>
          <p style={{ fontSize: "13px", color: "#78716C", margin: 0 }}>
            Answer 3 questions — see your funding matches instantly.
          </p>
        </div>

        {!result ? (
          /* Form */
          <div style={{ background: "#FAFAF9", border: "1px solid #E7E5E4", borderRadius: "12px", padding: "20px" }}>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#44403C", marginBottom: "6px" }}>
                Organization Type
              </label>
              <select
                value={form.entityType}
                onChange={(e) => setForm({ ...form, entityType: e.target.value })}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: "8px",
                  border: "1px solid #D6D3D1", background: "#fff",
                  fontSize: "14px", color: form.entityType ? "#1C1917" : "#A8A29E",
                  outline: "none", boxSizing: "border-box", cursor: "pointer",
                }}
              >
                {ENTITY_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.value === ""}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#44403C", marginBottom: "6px" }}>
                Industry / Focus Area
              </label>
              <select
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: "8px",
                  border: "1px solid #D6D3D1", background: "#fff",
                  fontSize: "14px", color: form.industry ? "#1C1917" : "#A8A29E",
                  outline: "none", boxSizing: "border-box", cursor: "pointer",
                }}
              >
                {INDUSTRIES.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.value === ""}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#44403C", marginBottom: "6px" }}>
                State
              </label>
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: "8px",
                  border: "1px solid #D6D3D1", background: "#fff",
                  fontSize: "14px", color: form.state ? "#1C1917" : "#A8A29E",
                  outline: "none", boxSizing: "border-box", cursor: "pointer",
                }}
              >
                {US_STATES.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.value === ""}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p style={{ fontSize: "13px", color: "#ef4444", marginBottom: "12px", textAlign: "center" }}>
                {error}
              </p>
            )}

            <button
              onClick={handleFind}
              disabled={!canSubmit || loading}
              style={{
                width: "100%", padding: "12px", borderRadius: "8px",
                background: canSubmit && !loading ? "#0D9488" : "#D6D3D1",
                color: "#fff", fontSize: "15px", fontWeight: "600",
                border: "none", cursor: canSubmit && !loading ? "pointer" : "not-allowed",
                transition: "background 0.15s",
              }}
            >
              {loading ? "Finding your grants..." : "Find My Grants"}
            </button>
          </div>
        ) : (
          /* Result */
          <div style={{ background: "#F0FDFA", border: "1px solid #5EEAD4", borderRadius: "12px", padding: "24px", textAlign: "center" }}>
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "13px", color: "#0D9488", fontWeight: "600", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Your Results
              </p>
              <p style={{ fontSize: "28px", fontWeight: "800", color: "#1C1917", margin: "0 0 6px", lineHeight: 1.2 }}>
                You match <span style={{ color: "#0D9488" }}>{result.matchCount} grants</span>
              </p>
              <p style={{ fontSize: "16px", color: "#57534E", margin: 0 }}>
                worth <strong style={{ color: "#0D9488" }}>{formatFunding(result.estimatedFunding)}</strong> in potential funding
              </p>
            </div>

            {result.topCategories?.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "12px", color: "#78716C", marginBottom: "8px" }}>Top categories for you:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                  {result.topCategories.map((c) => (
                    <span
                      key={c.category}
                      style={{
                        padding: "4px 10px", borderRadius: "999px",
                        background: "#fff", border: "1px solid #5EEAD4",
                        fontSize: "12px", color: "#0D9488", fontWeight: "500",
                      }}
                    >
                      {c.category}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <a
              href={signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "13px 24px", borderRadius: "8px",
                background: "#0D9488", color: "#fff",
                fontSize: "15px", fontWeight: "700",
                textDecoration: "none", transition: "background 0.15s",
              }}
            >
              See your full matches — free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>

            <p style={{ fontSize: "11px", color: "#A8A29E", marginTop: "12px" }}>
              No credit card required. Free to start.
            </p>

            <button
              onClick={() => setResult(null)}
              style={{
                marginTop: "8px", background: "none", border: "none",
                fontSize: "12px", color: "#78716C", cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Search again
            </button>
          </div>
        )}

        {/* Powered by */}
        <p style={{ textAlign: "center", fontSize: "11px", color: "#A8A29E", marginTop: "12px" }}>
          Powered by{" "}
          <a href="https://grantiq-gold.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: "#0D9488", textDecoration: "none" }}>
            GrantIQ
          </a>
        </p>
      </div>
    </div>
  );
}

export default function EmbedFinderPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ color: "#78716C", fontSize: "14px" }}>Loading...</p>
      </div>
    }>
      <GrantFinderWidget />
    </Suspense>
  );
}
