import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface EligibilityReportProps {
  userName: string;
  companyName: string;
  verdict: string;
  readinessScore: number;
  grantUniverseLow: string;
  grantUniverseHigh: string;
  programCount: number;
  quickWins: Array<{ action: string; where: string; time: string; cost: string }>;
  topBlockers: Array<{ issue: string; severity: string }>;
  eligibleCategories: Array<{ category: string; status: string }>;
  appBaseUrl?: string;
}

const TEAL = "#0D9488";
const WARM_900 = "#1C1917";
const WARM_700 = "#44403C";
const WARM_500 = "#78716C";
const WARM_200 = "#E7E5E4";
const WARM_50 = "#FAFAF9";

const VERDICT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  eligible_now: { bg: "#ECFDF5", text: "#065F46", label: "Eligible Now" },
  conditionally_eligible: { bg: "#FFFBEB", text: "#92400E", label: "Conditionally Eligible" },
  eligible_after_remediation: { bg: "#EFF6FF", text: "#1E40AF", label: "Eligible After Remediation" },
  not_eligible: { bg: "#FEF2F2", text: "#991B1B", label: "Not Eligible in Current Form" },
};

export function EligibilityReport({
  userName,
  companyName,
  verdict,
  readinessScore,
  grantUniverseLow,
  grantUniverseHigh,
  programCount,
  quickWins,
  topBlockers,
  eligibleCategories,
  appBaseUrl = "https://grantaq.com",
}: EligibilityReportProps) {
  const v = VERDICT_COLORS[verdict] ?? VERDICT_COLORS.not_eligible;

  return (
    <Html lang="en">
      <Head />
      <Preview>Your Grant Eligibility Report — {v.label} | {companyName}</Preview>

      <Body style={{ backgroundColor: WARM_50, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>

          {/* Header */}
          <Section style={{ backgroundColor: TEAL, padding: "28px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, margin: "0 0 6px" }}>
              GrantAQ
            </Text>
            <Heading as="h1" style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, margin: 0 }}>
              Grant Eligibility Report
            </Heading>
          </Section>

          {/* Verdict */}
          <Section style={{ padding: "32px 40px 0" }}>
            <Text style={{ fontSize: 14, color: WARM_700, margin: "0 0 16px" }}>
              Hi {userName},
            </Text>
            <Text style={{ fontSize: 14, color: WARM_700, margin: "0 0 20px", lineHeight: "1.6" }}>
              Your grant eligibility assessment for <strong>{companyName}</strong> is ready. Here&apos;s the headline:
            </Text>

            <Section style={{ backgroundColor: v.bg, borderRadius: 8, padding: "20px 24px", margin: "0 0 20px" }}>
              <Text style={{ fontSize: 18, fontWeight: 700, color: v.text, margin: "0 0 8px" }}>
                {v.label}
              </Text>
              <Text style={{ fontSize: 14, color: WARM_700, margin: "0 0 12px" }}>
                Readiness Score: <strong>{readinessScore}/100</strong>
              </Text>
              <Text style={{ fontSize: 14, color: WARM_700, margin: 0 }}>
                Estimated Grant Universe: <strong>{grantUniverseLow}–{grantUniverseHigh}</strong> across ~{programCount} programs
              </Text>
            </Section>
          </Section>

          {/* Quick Wins */}
          {quickWins.length > 0 && (
            <Section style={{ padding: "0 40px 24px" }}>
              <Heading as="h2" style={{ fontSize: 16, color: WARM_900, margin: "0 0 12px" }}>
                Quick Wins (Next 30 Days)
              </Heading>
              {quickWins.slice(0, 3).map((qw, i) => (
                <Text key={i} style={{ fontSize: 13, color: WARM_700, margin: "0 0 8px", lineHeight: "1.5" }}>
                  <strong>{i + 1}.</strong> {qw.action} — {qw.where} · {qw.time} · {qw.cost}
                </Text>
              ))}
            </Section>
          )}

          {/* Top Blockers */}
          {topBlockers.length > 0 && (
            <Section style={{ padding: "0 40px 24px" }}>
              <Heading as="h2" style={{ fontSize: 16, color: WARM_900, margin: "0 0 12px" }}>
                Top Blockers to Fix
              </Heading>
              {topBlockers.slice(0, 3).map((b, i) => (
                <Text key={i} style={{ fontSize: 13, color: WARM_700, margin: "0 0 6px" }}>
                  <span style={{ color: b.severity === "critical" ? "#DC2626" : "#D97706", fontWeight: 600 }}>
                    [{b.severity.toUpperCase()}]
                  </span>{" "}
                  {b.issue}
                </Text>
              ))}
            </Section>
          )}

          <Hr style={{ borderColor: WARM_200, margin: "0 40px 24px" }} />

          {/* CTA */}
          <Section style={{ padding: "0 40px 32px", textAlign: "center" as const }}>
            <Text style={{ fontSize: 14, color: WARM_700, margin: "0 0 16px" }}>
              Want the full picture? Get your comprehensive 10-step Readiness Diagnostic — covers
              5 audit layers, internal controls, site-visit simulation, funder matching, and a
              complete remediation roadmap.
            </Text>
            <Button
              href={`${appBaseUrl}/signup?service=diagnostic`}
              style={{ backgroundColor: TEAL, color: "#ffffff", fontSize: 14, fontWeight: 600, padding: "12px 32px", borderRadius: 8, textDecoration: "none" }}
            >
              Get Full Diagnostic — Free
            </Button>
          </Section>

          {/* Footer */}
          <Section style={{ backgroundColor: WARM_50, padding: "20px 40px", borderTop: `1px solid ${WARM_200}` }}>
            <Text style={{ fontSize: 11, color: WARM_500, margin: 0, textAlign: "center" as const }}>
              GrantAQ · AI-Powered Grant Discovery
            </Text>
            <Text style={{ fontSize: 11, color: WARM_500, margin: "4px 0 0", textAlign: "center" as const }}>
              <Link href={`${appBaseUrl}`} style={{ color: WARM_500 }}>grantaq.com</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
