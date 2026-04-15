import { Text, Button, Section } from "@react-email/components";
import { EmailLayout, bodyText, bulletText, ctaStyle, signoffText } from "./shared-layout";

export interface ReportConditionalProps {
  firstName: string;
  companyName: string;
  verdict: string;
  score: number;
  topBlocker: string;
  grantUniverseLow: string;
  grantUniverseHigh: string;
  programCount: number;
  quickWin1: string;
  quickWin2: string;
  quickWin3: string;
  recommendedTier: string;
  appBaseUrl?: string;
  calendarUrl?: string;
}

export function ReportConditional({ firstName, companyName, verdict, score, topBlocker, grantUniverseLow, grantUniverseHigh, programCount, quickWin1, quickWin2, quickWin3, recommendedTier, appBaseUrl = "https://grantaq.com", calendarUrl }: ReportConditionalProps) {
  const verdictLabel = verdict === "conditionally_eligible" ? "🟡 Conditionally Eligible" : "⏳ Eligible After Remediation";
  const verdictBg = verdict === "conditionally_eligible" ? "#FFFBEB" : "#EFF6FF";
  const verdictColor = verdict === "conditionally_eligible" ? "#92400E" : "#1E40AF";

  return (
    <EmailLayout preview={`Your Grant Eligibility Report — Clear Path to Eligibility | ${companyName}`} headerSubtitle="Grant Eligibility Report">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>Your Grant Eligibility &amp; Readiness Diagnostic is ready.</Text>
      <Section style={{ backgroundColor: verdictBg, borderRadius: 8, padding: "20px 24px", margin: "0 0 20px" }}>
        <Text style={{ fontSize: 18, fontWeight: 700, color: verdictColor, margin: "0 0 8px" }}>
          {verdictLabel}
        </Text>
        <Text style={{ fontSize: 14, color: "#1C1917", margin: 0 }}>
          You&apos;re not grant-eligible today, but you have a clear, achievable path to eligibility. Once you&apos;re ready, you&apos;ll be positioned for approximately <strong>{grantUniverseLow}–{grantUniverseHigh}</strong> in annual grant opportunities across <strong>{programCount} programs</strong>.
        </Text>
      </Section>
      <Text style={{ ...bodyText, fontWeight: 600 }}>Three numbers worth knowing:</Text>
      <Text style={bulletText}>• Eligibility verdict: {verdictLabel}</Text>
      <Text style={bulletText}>• Readiness score: {score}/100</Text>
      <Text style={bulletText}>• Biggest blocker: {topBlocker}</Text>
      <Text style={{ ...bodyText, fontWeight: 600, marginTop: 16 }}>Quick wins you can do this week:</Text>
      <Text style={bulletText}>1. {quickWin1}</Text>
      <Text style={bulletText}>2. {quickWin2}</Text>
      <Text style={bulletText}>3. {quickWin3}</Text>
      <Text style={bodyText}>Our recommendation: <strong>{recommendedTier}</strong></Text>
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
