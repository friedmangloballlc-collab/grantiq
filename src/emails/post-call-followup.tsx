import { Text, Button, Section } from "@react-email/components";
import { EmailLayout, bodyText, bulletText, ctaStyle, signoffText } from "./shared-layout";

export interface PostCallFollowupProps { firstName: string; situationRecap: string; tierName: string; tierPrice: string; tierTimeline: string; deliverables: string[]; stripeLink: string; calendarUrl?: string; }

export function PostCallFollowup({ firstName, situationRecap, tierName, tierPrice, tierTimeline, deliverables, stripeLink, calendarUrl }: PostCallFollowupProps) {
  return (
    <EmailLayout preview={`Quick follow-up from our call — ${tierName} details`} headerSubtitle="Call Follow-Up">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>Great talking with you today. As discussed, here&apos;s what we covered:</Text>
      <Text style={bodyText}><strong>Your situation:</strong> {situationRecap}</Text>
      <Text style={bodyText}><strong>Recommended path:</strong> {tierName} — {tierPrice}, delivered over {tierTimeline}</Text>
      <Text style={{ ...bodyText, fontWeight: 600 }}>What you get:</Text>
      {deliverables.map((d, i) => <Text key={i} style={bulletText}>• {d}</Text>)}
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={stripeLink} style={ctaStyle}>Get Started — {tierPrice}</Button>
      </Section>
      <Text style={bodyText}>Once payment goes through, you&apos;ll get a kickoff email with our intake checklist and a link to schedule your first working session.</Text>
      {calendarUrl && <Text style={bodyText}>If you&apos;d like to discuss further before committing, <a href={calendarUrl} style={{ color: "#0D9488" }}>book another quick call</a>.</Text>}
      <Text style={signoffText}>Talk soon,<br />The GrantAQ Team</Text>
    </EmailLayout>
  );
}
