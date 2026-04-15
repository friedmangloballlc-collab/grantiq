import { Text } from "@react-email/components";
import { EmailLayout, bodyText, signoffText } from "./shared-layout";

export interface DiscoveryCallReminderProps { firstName: string; time: string; timezone: string; calendarUrl: string; }

export function DiscoveryCallReminder({ firstName, time, timezone, calendarUrl }: DiscoveryCallReminderProps) {
  return (
    <EmailLayout preview={`Reminder: Our call tomorrow at ${time}`} headerSubtitle="Call Reminder">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>Quick reminder — we&apos;re scheduled for <strong>tomorrow at {time} {timezone}</strong>.</Text>
      <Text style={bodyText}>If you need to reschedule, <a href={calendarUrl} style={{ color: "#0D9488" }}>here&apos;s the link</a>.</Text>
      <Text style={bodyText}>If you&apos;re still on, no action needed. Talk soon.</Text>
      <Text style={signoffText}>The GrantAQ Team</Text>
    </EmailLayout>
  );
}
