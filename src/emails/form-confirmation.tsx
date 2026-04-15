import { Text, Button, Section } from "@react-email/components";
import { EmailLayout, bodyText, bulletText, ctaStyle, signoffText } from "./shared-layout";

export interface FormConfirmationProps {
  firstName: string;
  companyName: string;
  appBaseUrl?: string;
}

export function FormConfirmation({ firstName, companyName, appBaseUrl = "https://grantaq.com" }: FormConfirmationProps) {
  return (
    <EmailLayout preview={`We got your information, ${firstName} — your report is being prepared`} headerSubtitle="Intake Received">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>
        Thanks for submitting your intake — I&apos;ve got everything from {companyName} and your Grant Eligibility &amp; Readiness Diagnostic is being prepared right now.
      </Text>
      <Text style={{ ...bodyText, fontWeight: 600 }}>Here&apos;s what to expect:</Text>
      <Text style={bulletText}>• A clear yes/no on whether you&apos;re eligible for grants today</Text>
      <Text style={bulletText}>• Your readiness score (0–100)</Text>
      <Text style={bulletText}>• An estimate of the total grant funding you&apos;re positioned for</Text>
      <Text style={bulletText}>• Your top funder matches — ranked for first-time applicants</Text>
      <Text style={bulletText}>• A step-by-step remediation roadmap with costs and timelines</Text>
      <Text style={bodyText}>
        If I have any questions about your submission, I&apos;ll reach out directly. Otherwise, watch for your report.
      </Text>
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={appBaseUrl} style={ctaStyle}>Visit GrantAQ</Button>
      </Section>
      <Text style={signoffText}>Talk soon,<br />The GrantAQ Team</Text>
    </EmailLayout>
  );
}
