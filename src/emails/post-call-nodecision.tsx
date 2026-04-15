import { Text, Button, Section } from "@react-email/components";
import { EmailLayout, bodyText, bulletText, ctaStyle, signoffText } from "./shared-layout";

export interface PostCallNoDecisionProps { firstName: string; deadline: string; opportunity: string; tier1Price: string; calendarUrl: string; stripeLink: string; }

export function PostCallNoDecision({ firstName, deadline, opportunity, tier1Price, calendarUrl, stripeLink }: PostCallNoDecisionProps) {
  return (
    <EmailLayout preview="Following up on your grant readiness path" headerSubtitle="Following Up">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>Wanted to circle back after our call earlier this week.</Text>
      <Text style={bodyText}>I know choosing the right engagement is a real decision — happy to answer any questions that came up after we talked, or jump on another short call if it&apos;d help.</Text>
      <Text style={{ ...bodyText, fontWeight: 600 }}>A few things worth keeping in mind:</Text>
      <Text style={bulletText}>• {deadline} — which would mean missing {opportunity} if we don&apos;t get started soon</Text>
      <Text style={bulletText}>• If pricing is the friction, we have a Tier 1 option at {tier1Price} that gives you a full diagnostic + walkthrough without the remediation buildout</Text>
      <Text style={bulletText}>• If timing is the issue, we can start anytime — your diagnostic stays current for 6 months</Text>
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={stripeLink} style={ctaStyle}>Get Started</Button>
      </Section>
      <Text style={bodyText}><a href={calendarUrl} style={{ color: "#0D9488" }}>Or book another quick call</a> if you have more questions.</Text>
      <Text style={signoffText}>The GrantAQ Team</Text>
    </EmailLayout>
  );
}
