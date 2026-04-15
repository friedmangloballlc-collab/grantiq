import { Text, Button, Section } from "@react-email/components";
import { EmailLayout, bodyText, bulletText, ctaStyle, signoffText } from "./shared-layout";

export interface FinalFollowupProps { firstName: string; tier1Price: string; starterKitPrice: string; stripeLink: string; }

export function FinalFollowup({ firstName, tier1Price, starterKitPrice, stripeLink }: FinalFollowupProps) {
  return (
    <EmailLayout preview="One last note — and a small offer" headerSubtitle="Last Note">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>I won&apos;t keep nudging — this is my last note for now.</Text>
      <Text style={bodyText}>If you&apos;ve decided grant funding isn&apos;t the right move right now, totally fair. Save the report — it&apos;ll be useful whenever you do decide to pursue this.</Text>
      <Text style={bodyText}>If the issue is fit or pricing, here are two smaller options:</Text>
      <Text style={bulletText}>• <strong>Tier 1 Audit</strong> at {tier1Price} — full diagnostic and walkthrough, no remediation buildout</Text>
      <Text style={bulletText}>• <strong>Pre-Readiness Starter Kit</strong> at {starterKitPrice} — DIY templates, policies, and walkthroughs for the most common gaps</Text>
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={stripeLink} style={ctaStyle}>View Options</Button>
      </Section>
      <Text style={bodyText}>Either way, your diagnostic is saved. Come back whenever you&apos;re ready.</Text>
      <Text style={signoffText}>All the best,<br />The GrantAQ Team</Text>
    </EmailLayout>
  );
}
