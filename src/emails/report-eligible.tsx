import { Text, Button, Section } from "@react-email/components";
import { EmailLayout, bodyText, bulletText, ctaStyle, signoffText } from "./shared-layout";

export interface ReportEligibleProps {
  firstName: string;
  companyName: string;
  score: number;
  grantUniverseLow: string;
  grantUniverseHigh: string;
  programCount: number;
  topFunder: string;
  topFunderRange: string;
  recommendedTier: string;
  appBaseUrl?: string;
  calendarUrl?: string;
}

export function ReportEligible({ firstName, companyName, score, grantUniverseLow, grantUniverseHigh, programCount, topFunder, topFunderRange, recommendedTier, appBaseUrl = "https://grantaq.com", calendarUrl }: ReportEligibleProps) {
  return (
    <EmailLayout preview={`Your Grant Eligibility Report — Eligible Now | ${companyName}`} headerSubtitle="Grant Eligibility Report">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>
        Your Grant Eligibility &amp; Readiness Diagnostic is ready.
      </Text>
      <Section style={{ backgroundColor: "#ECFDF5", borderRadius: 8, padding: "20px 24px", margin: "0 0 20px" }}>
        <Text style={{ fontSize: 18, fontWeight: 700, color: "#065F46", margin: "0 0 8px" }}>
          ✅ You Are Grant-Eligible
        </Text>
        <Text style={{ fontSize: 14, color: "#1C1917", margin: "0 0 4px" }}>
          Based on your profile, you&apos;re positioned for approximately <strong>{grantUniverseLow}–{grantUniverseHigh}</strong> in annual grant opportunities across <strong>{programCount} programs</strong> you can begin applying to immediately.
        </Text>
      </Section>
      <Text style={{ ...bodyText, fontWeight: 600 }}>Three numbers worth knowing:</Text>
      <Text style={bulletText}>• Eligibility verdict: ✅ Eligible Now</Text>
      <Text style={bulletText}>• Readiness score: {score}/100</Text>
      <Text style={bulletText}>• Top funder match: {topFunder} — typical award range {topFunderRange}</Text>
      <Text style={bodyText}>Our recommendation: <strong>{recommendedTier}</strong></Text>
      <Text style={bodyText}>
        The full report is available in your account. It includes your complete readiness audit, funder matches, and application-ready roadmap.
      </Text>
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={`${appBaseUrl}/services/readiness-diagnostic`} style={ctaStyle}>View Full Report</Button>
      </Section>
      {calendarUrl && (
        <Section style={{ textAlign: "center" as const, margin: "0 0 20px" }}>
          <Button href={calendarUrl} style={{ ...ctaStyle, backgroundColor: "#1C1917" }}>Book Discovery Call</Button>
        </Section>
      )}
      <Text style={signoffText}>Talk soon,<br />The GrantAQ Team</Text>
    </EmailLayout>
  );
}
