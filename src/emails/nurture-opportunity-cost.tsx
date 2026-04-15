import { Text, Button, Section } from "@react-email/components";
import { EmailLayout, bodyText, bulletText, ctaStyle, signoffText } from "./shared-layout";

export interface OpportunityCostEmailProps { firstName: string; grantUniverseLow: string; grantUniverseHigh: string; appBaseUrl?: string; calendarUrl?: string; }

export function OpportunityCostEmail({ firstName, grantUniverseLow, grantUniverseHigh, appBaseUrl = "https://grantaq.com", calendarUrl }: OpportunityCostEmailProps) {
  return (
    <EmailLayout preview={`${firstName}, your grant universe is ${grantUniverseLow}–${grantUniverseHigh}`} headerSubtitle="Your Grant Universe">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>
        Ten days ago, your eligibility report estimated your addressable grant universe at <strong>{grantUniverseLow}–{grantUniverseHigh} annually</strong>.
      </Text>
      <Text style={bodyText}>That&apos;s the total you&apos;d be eligible to apply for once you&apos;re fully grant-ready. Not what you&apos;d win — what you could compete for.</Text>
      <Text style={{ ...bodyText, fontWeight: 600 }}>Here&apos;s what that number means in practice:</Text>
      <Text style={bulletText}>• First-time applicants typically win 5-15% of applications submitted</Text>
      <Text style={bulletText}>• At 10 applications, that&apos;s 1-2 wins in year one</Text>
      <Text style={bulletText}>• Average first-time award: $15K-$75K depending on program type</Text>
      <Text style={bulletText}>• Win rates improve significantly with each subsequent award</Text>
      <Text style={bodyText}>Every month you wait, grant cycles close. Programs that were open today may not reopen for 12 months.</Text>
      <Text style={bodyText}>The question isn&apos;t whether grants are worth pursuing. It&apos;s whether you start this cycle or the next one.</Text>
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        {calendarUrl ? (
          <Button href={calendarUrl} style={ctaStyle}>Book a 15-Min Discovery Call</Button>
        ) : (
          <Button href={`${appBaseUrl}/signup?service=diagnostic`} style={ctaStyle}>Get Your Full Roadmap</Button>
        )}
      </Section>
      <Text style={signoffText}>The GrantAQ Team</Text>
    </EmailLayout>
  );
}
