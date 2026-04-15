import { Text, Button, Section } from "@react-email/components";
import { EmailLayout, bodyText, bulletText, ctaStyle, signoffText } from "./shared-layout";

export interface SocialProofEmailProps { firstName: string; companyName: string; appBaseUrl?: string; }

export function SocialProofEmail({ firstName, companyName, appBaseUrl = "https://grantaq.com" }: SocialProofEmailProps) {
  return (
    <EmailLayout preview={`How businesses like ${companyName} get grant-ready in 90 days`} headerSubtitle="What Others Are Doing">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>Since sending your eligibility report, I wanted to share what we see organizations like yours typically do next.</Text>
      <Text style={{ ...bodyText, fontWeight: 600 }}>The 90-day pattern that works:</Text>
      <Text style={bulletText}><strong>Weeks 1-2:</strong> Quick wins — EIN, bank account, SAM.gov registration started. Total cost: $0.</Text>
      <Text style={bulletText}><strong>Weeks 3-4:</strong> Governance docs — adopt a Conflict of Interest policy, Document Retention policy, and Code of Ethics. Free templates available from BoardSource and National Council of Nonprofits.</Text>
      <Text style={bulletText}><strong>Weeks 5-8:</strong> Financial cleanup — compile 3 years of statements, get current financials within 90 days, set up grant-tracking chart of accounts.</Text>
      <Text style={bulletText}><strong>Weeks 9-12:</strong> First applications — submit to 3-5 starter grants (Amber Grant, Hello Alice, Comcast RISE, local community foundations). Build track record with small wins.</Text>
      <Text style={bodyText}>The organizations that follow this path typically go from a 30-40 readiness score to 70+ within 90 days. The ones that don&apos;t are still at the same score a year later.</Text>
      <Text style={bodyText}>Want help executing this? Our Tier 2 Roadmap gives you the step-by-step playbook, templates, and strategy calls to make it happen in 2-3 weeks instead of 3 months.</Text>
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={`${appBaseUrl}/signup?service=diagnostic`} style={ctaStyle}>Get Your Roadmap</Button>
      </Section>
      <Text style={signoffText}>The GrantAQ Team</Text>
    </EmailLayout>
  );
}
