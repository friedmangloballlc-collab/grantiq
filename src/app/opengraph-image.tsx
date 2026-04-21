// src/app/opengraph-image.tsx
//
// Dynamic OpenGraph image for link previews on LinkedIn, Slack,
// Twitter, iMessage, and any other crawler that respects og:image.
// Runs at build time (or on-demand) and emits a 1200×630 PNG from
// the JSX below.
//
// Why dynamic instead of a static PNG in /public:
//   1. Stays in sync with brand changes — no design tool round-trip
//   2. Can incorporate live data later (grant count, new features)
//   3. Next.js optimizes caching for us
//
// Replaces the prior static /public/og-image.png which was a 1200×1200
// square app icon — wrong aspect ratio, LinkedIn/Slack cropped it.

import { ImageResponse } from "next/og";

// Route segment config for Next.js OG convention.
export const runtime = "edge";
export const alt = "GrantAQ — Find Grants You Actually Qualify For";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "linear-gradient(135deg, #FAFAF9 0%, #F5F5F4 40%, #E7E5E4 100%)",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        {/* Top: brandmark + eyebrow */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "#0B7C72",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            G
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 600,
              color: "#1C1917",
              letterSpacing: "-0.01em",
            }}
          >
            GrantAQ
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#0B7C72",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Nonprofit Grant Intelligence
          </div>
        </div>

        {/* Middle: headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            marginTop: "-40px",
          }}
        >
          <div
            style={{
              fontSize: "84px",
              lineHeight: 1.05,
              fontWeight: 700,
              color: "#1C1917",
              letterSpacing: "-0.03em",
              maxWidth: "900px",
            }}
          >
            Find grants you actually qualify for.
          </div>
          <div
            style={{
              fontSize: "28px",
              lineHeight: 1.4,
              color: "#57534E",
              maxWidth: "820px",
              marginTop: "8px",
            }}
          >
            AI matches your organization to 6,000+ active federal, state,
            and foundation grants — verified nightly.
          </div>
        </div>

        {/* Bottom: trust strip + URL */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #D6D3D1",
            paddingTop: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "32px",
              fontSize: "18px",
              color: "#57534E",
              fontWeight: 500,
            }}
          >
            <span>Grants.gov</span>
            <span style={{ color: "#A8A29E" }}>·</span>
            <span>SAM.gov</span>
            <span style={{ color: "#A8A29E" }}>·</span>
            <span>IRS Exempt Org</span>
            <span style={{ color: "#A8A29E" }}>·</span>
            <span>ProPublica 990s</span>
          </div>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 600,
              color: "#0B7C72",
              letterSpacing: "-0.01em",
            }}
          >
            grantaq.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
