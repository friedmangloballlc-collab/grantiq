import { Text } from "@react-email/components";
import { EmailLayout, bodyText, bulletText, signoffText } from "./shared-layout";

export interface DiscoveryCallConfirmProps { firstName: string; date: string; time: string; timezone: string; calendarUrl: string; }

export function DiscoveryCallConfirm({ firstName, date, time, timezone, calendarUrl }: DiscoveryCallConfirmProps) {
  return (
    <EmailLayout preview={`Confirmed: Our 15-min call on ${date} at ${time}`} headerSubtitle="Call Confirmed">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>We&apos;re set for <strong>{date} at {time} {timezone}</strong> for our 15-minute discovery call.</Text>
      <Text style={bodyText}>Calendar invite is in your inbox.</Text>
      <Text style={{ ...bodyText, fontWeight: 600 }}>To make the most of our 15 minutes:</Text>
      <Text style={bulletText}>• Skim the report before the call — even 5 minutes helps</Text>
      <Text style={bulletText}>• Bring 1–3 specific questions about anything that wasn&apos;t clear</Text>
      <Text style={bulletText}>• Have your calendar handy in case we want to schedule a kickoff</Text>
      <Text style={{ ...bodyText, fontWeight: 600 }}>What we&apos;ll cover:</Text>
      <Text style={bulletText}>• The headline findings in your report</Text>
      <Text style={bulletText}>• Which tier fits your situation and why</Text>
      <Text style={bulletText}>• Any questions you have about the process</Text>
      <Text style={bodyText}>What we won&apos;t do: pitch you on something you don&apos;t need.</Text>
      <Text style={bodyText}>Need to reschedule? <a href={calendarUrl} style={{ color: "#0D9488" }}>Use this link</a>.</Text>
      <Text style={signoffText}>See you then,<br />The GrantAQ Team</Text>
    </EmailLayout>
  );
}
