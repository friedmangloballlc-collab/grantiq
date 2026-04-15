import { Text, Button, Section } from "@react-email/components";
import { EmailLayout, bodyText, bulletText, ctaStyle, signoffText } from "./shared-layout";

// 5.1 — Intake Checklist Reminder
export interface IntakeReminderProps { firstName: string; date: string; uploadLink: string; }
export function IntakeReminder({ firstName, date, uploadLink }: IntakeReminderProps) {
  return (
    <EmailLayout preview="Quick nudge — we're ready when you are" headerSubtitle="Intake Reminder">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>Just a friendly nudge — I haven&apos;t received the intake documents yet for your engagement. We can move forward with what you have, even if it&apos;s incomplete.</Text>
      <Text style={{ ...bodyText, fontWeight: 600 }}>A few options:</Text>
      <Text style={bulletText}>• Email me what you have so far</Text>
      <Text style={bulletText}>• Upload to our shared folder: <a href={uploadLink} style={{ color: "#0D9488" }}>Upload Link</a></Text>
      <Text style={bulletText}>• Send by <strong>{date}</strong> so we stay on the original timeline</Text>
      <Text style={bodyText}>If you&apos;ve hit a snag finding something specific, just tell me what — most of these documents have free alternatives or workarounds.</Text>
      <Text style={signoffText}>The GrantAQ Team</Text>
    </EmailLayout>
  );
}

// 5.2 — Midpoint Check-In
export interface MidpointCheckInProps { firstName: string; tierName: string; completed: string[]; inProgress: string[]; upcoming: string[]; openItems: Array<{ item: string; date: string }>; targetDate: string; }
export function MidpointCheckIn({ firstName, tierName, completed, inProgress, upcoming, openItems, targetDate }: MidpointCheckInProps) {
  return (
    <EmailLayout preview={`Quick midpoint update on your ${tierName} engagement`} headerSubtitle="Midpoint Update">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>We&apos;re at the midpoint of your <strong>{tierName}</strong> engagement. Here&apos;s where things stand:</Text>
      <Text style={{ ...bodyText, fontWeight: 600 }}>Completed so far:</Text>
      {completed.map((c, i) => <Text key={i} style={bulletText}>✅ {c}</Text>)}
      <Text style={{ ...bodyText, fontWeight: 600, marginTop: 12 }}>In progress:</Text>
      {inProgress.map((c, i) => <Text key={i} style={bulletText}>🔄 {c}</Text>)}
      <Text style={{ ...bodyText, fontWeight: 600, marginTop: 12 }}>Coming up next:</Text>
      {upcoming.map((c, i) => <Text key={i} style={bulletText}>📋 {c}</Text>)}
      {openItems.length > 0 && (
        <>
          <Text style={{ ...bodyText, fontWeight: 600, marginTop: 12 }}>Anything from you we&apos;re waiting on:</Text>
          {openItems.map((o, i) => <Text key={i} style={bulletText}>• {o.item} — needed by {o.date}</Text>)}
        </>
      )}
      <Text style={bodyText}>We&apos;re on track for delivery by <strong>{targetDate}</strong>.</Text>
      <Text style={signoffText}>The GrantAQ Team</Text>
    </EmailLayout>
  );
}

// 5.3 — Engagement Delivery / Wrap
export interface EngagementWrapProps { firstName: string; tierName: string; deliverables: string[]; nextSteps: string[]; folderLink: string; calendarUrl: string; }
export function EngagementWrap({ firstName, tierName, deliverables, nextSteps, folderLink, calendarUrl }: EngagementWrapProps) {
  return (
    <EmailLayout preview={`Your ${tierName} engagement is complete — here's everything`} headerSubtitle="Engagement Complete">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>Your <strong>{tierName}</strong> engagement is officially complete. Everything we built together is in your shared folder:</Text>
      <Section style={{ textAlign: "center" as const, margin: "16px 0" }}>
        <Button href={folderLink} style={ctaStyle}>View Deliverables</Button>
      </Section>
      <Text style={{ ...bodyText, fontWeight: 600 }}>What you have:</Text>
      {deliverables.map((d, i) => <Text key={i} style={bulletText}>✅ {d}</Text>)}
      <Text style={{ ...bodyText, fontWeight: 600, marginTop: 12 }}>Your immediate next steps:</Text>
      {nextSteps.map((s, i) => <Text key={i} style={bulletText}>{i + 1}. {s}</Text>)}
      <Text style={bodyText}>
        One ask: If you found this engagement valuable, would you be open to a short testimonial? Even 2–3 sentences helps other organizations like yours find us. Just reply to this email.
      </Text>
      <Text style={bodyText}>
        I&apos;ll check in again in 30 days to see how things are going. In the meantime, <a href={calendarUrl} style={{ color: "#0D9488" }}>book a call anytime</a> if questions come up.
      </Text>
      <Text style={signoffText}>Congrats on getting grant-ready,<br />The GrantAQ Team</Text>
    </EmailLayout>
  );
}

// 6.1 — 30-Day Post-Engagement Upsell
export interface PostEngagementUpsellProps { firstName: string; tierName: string; appBaseUrl?: string; calendarUrl: string; }
export function PostEngagementUpsell({ firstName, tierName, appBaseUrl = "https://grantaq.com", calendarUrl }: PostEngagementUpsellProps) {
  return (
    <EmailLayout preview={`Checking in 30 days post-engagement`} headerSubtitle="30-Day Check-In">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>It&apos;s been about a month since we wrapped your <strong>{tierName}</strong> engagement. Quick check-in to see how things are going.</Text>
      <Text style={{ ...bodyText, fontWeight: 600 }}>A few questions:</Text>
      <Text style={bulletText}>• Have you been able to execute on the next steps we mapped out?</Text>
      <Text style={bulletText}>• Have any new questions come up?</Text>
      <Text style={bulletText}>• Are you ready to start applying — or would it help to have us draft applications for you?</Text>
      <Text style={{ ...bodyText, fontWeight: 600, marginTop: 12 }}>Two options if you&apos;re ready to move forward:</Text>
      <Text style={bulletText}>• <strong>Tier Upgrade:</strong> The next tier picks up where we left off — we execute the remediation instead of just planning it</Text>
      <Text style={bulletText}>• <strong>Grant Application Drafting:</strong> We write your first grant application using the AI Writing Engine + expert review</Text>
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={calendarUrl} style={ctaStyle}>Book a Quick Check-In Call</Button>
      </Section>
      <Text style={signoffText}>The GrantAQ Team</Text>
    </EmailLayout>
  );
}

// 6.2 — Annual Re-Diagnostic Reminder
export interface AnnualReDiagnosticProps { firstName: string; companyName: string; appBaseUrl?: string; }
export function AnnualReDiagnostic({ firstName, companyName, appBaseUrl = "https://grantaq.com" }: AnnualReDiagnosticProps) {
  return (
    <EmailLayout preview={`Time to refresh your Grant Readiness Diagnostic`} headerSubtitle="Annual Re-Diagnostic">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>It&apos;s been roughly a year since I delivered your original Grant Eligibility &amp; Readiness Diagnostic. A lot can change in 12 months.</Text>
      <Text style={{ ...bodyText, fontWeight: 600 }}>A re-diagnostic at this point typically catches:</Text>
      <Text style={bulletText}>• New funding programs you&apos;ve become eligible for</Text>
      <Text style={bulletText}>• Changes to existing program requirements</Text>
      <Text style={bulletText}>• Compliance items that have lapsed (SAM.gov, 990 filings, certifications)</Text>
      <Text style={bulletText}>• Documents that have aged out of the 90-day window funders require</Text>
      <Text style={bulletText}>• New demographic certifications you may now qualify for</Text>
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={`${appBaseUrl}/services/readiness-diagnostic`} style={ctaStyle}>Run Your Annual Re-Diagnostic</Button>
      </Section>
      <Text style={signoffText}>The GrantAQ Team</Text>
    </EmailLayout>
  );
}

// 7.1 — 90-Day Re-Engagement
export interface ReEngagement90Props { firstName: string; companyName: string; appBaseUrl?: string; calendarUrl: string; }
export function ReEngagement90({ firstName, companyName, appBaseUrl = "https://grantaq.com", calendarUrl }: ReEngagement90Props) {
  return (
    <EmailLayout preview="Still thinking about grants?" headerSubtitle="Checking In">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>It&apos;s been about three months since I sent your Grant Eligibility Diagnostic for <strong>{companyName}</strong>.</Text>
      <Text style={bodyText}>I&apos;m not writing to pitch — just to ask: did anything change?</Text>
      <Text style={{ ...bodyText, fontWeight: 600 }}>A few common things that shift over 90 days:</Text>
      <Text style={bulletText}>• New funding cycles open</Text>
      <Text style={bulletText}>• Organizations finally get their financial house in order</Text>
      <Text style={bulletText}>• Founders decide it&apos;s time to commit</Text>
      <Text style={bulletText}>• Budget becomes available</Text>
      <Text style={bodyText}>If any of those apply, the next step is straightforward: we can refresh your diagnostic or jump back into a tier engagement where we left off.</Text>
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={calendarUrl} style={ctaStyle}>Book a Quick Call</Button>
      </Section>
      <Text style={bodyText}>If you&apos;d prefer not to hear from me, reply &quot;unsubscribe&quot; and I&apos;ll remove you immediately.</Text>
      <Text style={signoffText}>The GrantAQ Team</Text>
    </EmailLayout>
  );
}

// 7.2 — Monthly Newsletter Template
export interface MonthlyNewsletterProps { firstName: string; month: string; fundingOpportunity: { name: string; description: string; deadline: string; eligibility: string }; complianceReminder: string; insight: string; appBaseUrl?: string; }
export function MonthlyNewsletter({ firstName, month, fundingOpportunity, complianceReminder, insight, appBaseUrl = "https://grantaq.com" }: MonthlyNewsletterProps) {
  return (
    <EmailLayout preview={`Grant intel for ${month} — 3 things worth knowing`} headerSubtitle={`${month} Grant Intel`}>
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>Three quick items worth your time this month:</Text>
      <Text style={{ ...bodyText, fontWeight: 600 }}>1. Funding opportunity worth flagging:</Text>
      <Text style={bulletText}><strong>{fundingOpportunity.name}</strong> — {fundingOpportunity.description}. Deadline: {fundingOpportunity.deadline}. Eligibility: {fundingOpportunity.eligibility}.</Text>
      <Text style={{ ...bodyText, fontWeight: 600, marginTop: 12 }}>2. Compliance reminder:</Text>
      <Text style={bulletText}>{complianceReminder}</Text>
      <Text style={{ ...bodyText, fontWeight: 600, marginTop: 12 }}>3. One thing I&apos;m seeing across diagnostics this month:</Text>
      <Text style={bulletText}>{insight}</Text>
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={`${appBaseUrl}/check`} style={ctaStyle}>Check Your Eligibility — Free</Button>
      </Section>
      <Text style={signoffText}>The GrantAQ Team</Text>
    </EmailLayout>
  );
}
