import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const count = searchParams.get("count") ?? "0";
  const value = searchParams.get("value") ?? "0";
  const org = searchParams.get("org") ?? "Your Organization";

  const formattedValue =
    Number(value) >= 1_000_000
      ? `$${(Number(value) / 1_000_000).toFixed(1)}M`
      : Number(value) >= 1_000
        ? `$${(Number(value) / 1_000).toFixed(0)}K`
        : `$${value}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #0d9488 0%, #0f766e 60%, #064e3b 100%)",
          padding: "60px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: "700",
              color: "white",
            }}
          >
            G
          </div>
          <span
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            GrantAQ
          </span>
        </div>

        {/* Main Content */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <div
            style={{
              fontSize: "20px",
              color: "rgba(255,255,255,0.8)",
              marginBottom: "16px",
              fontWeight: "500",
            }}
          >
            {org}
          </div>
          <div
            style={{
              fontSize: "68px",
              fontWeight: "800",
              color: "white",
              lineHeight: "1.05",
              letterSpacing: "-0.03em",
              marginBottom: "16px",
            }}
          >
            {count} Grants Found
          </div>
          <div
            style={{
              fontSize: "36px",
              fontWeight: "600",
              color: "rgba(255,255,255,0.9)",
              letterSpacing: "-0.02em",
            }}
          >
            Worth {formattedValue} in funding
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "40px",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "16px" }}>
            AI-powered grant discovery
          </span>
          <span
            style={{
              color: "white",
              fontSize: "16px",
              fontWeight: "600",
              background: "rgba(255,255,255,0.15)",
              padding: "8px 16px",
              borderRadius: "99px",
            }}
          >
            grantaq.com — Get your free matches
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
