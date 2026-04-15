import { Text, Button, Section } from "@react-email/components";
import { EmailLayout, bodyText, bulletText, ctaStyle, signoffText } from "./shared-layout";

export interface ReportNotEligibleProps {
  firstName: string;
  companyName: string;
  primaryBlocker: string;
  restructuringPath: string;
  appBaseUrl?: string;
  calendarUrl?: string;
}

export function ReportNotEligible({ firstName, companyName, primaryBlocker, restructuringPath, appBaseUrl = "https://grantaq.com", calendarUrl }: ReportNotEligibleProps) {
  return (
    <EmailLayout preview={`Your Grant Eligibility Report — Honest Findings + Path Forward | ${companyName}`} headerSubtitle="Grant Eligibility Report">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>Your Grant Eligibility &amp; Readiness Diagnostic is ready.</Text>
      <Section style={{ backgroundColor: "#FEF2F2", borderRadius: 8, padding: "20px 24px", margin: "0 0 20px" }}>
        <Text style={{ fontSize: 18, fontWeight: 700, color: "#991B1B", margin: "0 0 8px" }}>
          ❌ Not Eligible in Current Form
        </Text>
        <Text style={{ fontSize: 14, color: "#1C1917", margin: 0 }}>
          I want to be direct with you. In your current structure, you&apos;re not eligible for the grants you&apos;re targeting. That&apos;s not the end of the conversation — it&apos;s the start of a different one.
        </Text>
      </Section>
      <Text style={{ ...bodyText, fontWeight: 600 }}>Three numbers worth knowing:</Text>
      <Text style={bulletText}>• Eligibility verdict: ❌ Not Eligible in Current Form</Text>
      <Text style={bulletText}>• Why: {primaryBlocker}</Text>
      <Text style={bulletText}>• Realistic path: {restructuringPath}</Text>
      <Text style={bodyText}>
        <strong>You have two real options, and both are worth considering:</strong>
      </Text>
      <Text style={bulletText}>1. <strong>Restructure for grant eligibility</strong> — form a 501(c)(3) affiliate, use fiscal sponsorship, pursue demographic certifications, or reincorporate. Your report has the full options table with costs and timelines.</Text>
      <Text style={bulletText}>2. <strong>Pursue alternative capital</strong> — R&amp;D tax credits, SBA loans, CDFI community loans, revenue-based financing, pitch competitions. Grants aren&apos;t the only path to funded growth.</Text>
      <Text style={bodyText}>
        Your full report covers both paths in detail, including specific costs, timelines, and tradeoffs for each restructuring option.
      </Text>
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={`${appBaseUrl}/services/readiness-diagnostic`} style={ctaStyle}>View Full Report</Button>
      </Section>
      {calendarUrl && (
        <Text style={{ ...bodyText, textAlign: "center" as const }}>
          Or <a href={calendarUrl} style={{ color: "#0D9488", fontWeight: 600 }}>book a 15-minute call</a> to discuss your options.
        </Text>
      )}
      <Text style={signoffText}>Honestly,<br />The GrantAQ Team</Text>
    </EmailLayout>
  );
}
