import { Text, Button, Section } from "@react-email/components";
import { EmailLayout, bodyText, bulletText, ctaStyle, signoffText } from "./shared-layout";

export interface ReportLowConfidenceProps {
  firstName: string;
  companyName: string;
  keyGaps: string;
  directionalVerdict: string;
  appBaseUrl?: string;
  calendarUrl?: string;
}

export function ReportLowConfidence({ firstName, companyName, keyGaps, directionalVerdict, appBaseUrl = "https://grantaq.com", calendarUrl }: ReportLowConfidenceProps) {
  return (
    <EmailLayout preview={`Your Grant Readiness Snapshot — Tier 1 Audit Recommended | ${companyName}`} headerSubtitle="Grant Readiness Snapshot">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>Your initial Grant Readiness Snapshot is ready.</Text>
      <Section style={{ backgroundColor: "#F5F5F4", borderRadius: 8, padding: "20px 24px", margin: "0 0 20px" }}>
        <Text style={{ fontSize: 16, fontWeight: 700, color: "#1C1917", margin: "0 0 8px" }}>
          ℹ️ Insufficient Data for Full Verdict
        </Text>
        <Text style={{ fontSize: 14, color: "#44403C", margin: 0 }}>
          Based on the information you provided, I have a directional read on your eligibility — but not enough to issue a definitive verdict. To give you a reliable answer, I&apos;d need to dig into {keyGaps}.
        </Text>
      </Section>
      <Text style={{ ...bodyText, fontWeight: 600 }}>What I can tell you from your intake:</Text>
      <Text style={bulletText}>• Preliminary eligibility direction: {directionalVerdict}</Text>
      <Text style={bulletText}>• Confidence level: Low — key data points are missing</Text>
      <Text style={bulletText}>• Recommended next step: Tier 1 Readiness &amp; Eligibility Review</Text>
      <Text style={bodyText}>
        A Tier 1 Review includes a full diagnostic with document verification and a 45-minute walkthrough call where we fill in the gaps together. It&apos;s the fastest way to get a definitive answer on your eligibility.
      </Text>
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={`${appBaseUrl}/services/readiness-diagnostic`} style={ctaStyle}>View Snapshot</Button>
      </Section>
      {calendarUrl && (
        <Section style={{ textAlign: "center" as const, margin: "0 0 20px" }}>
          <Button href={calendarUrl} style={{ ...ctaStyle, backgroundColor: "#1C1917" }}>Book Tier 1 Review Call</Button>
        </Section>
      )}
      <Text style={signoffText}>Talk soon,<br />The GrantAQ Team</Text>
    </EmailLayout>
  );
}
