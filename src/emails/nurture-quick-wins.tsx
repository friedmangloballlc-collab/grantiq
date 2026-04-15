import { Text, Button, Section } from "@react-email/components";
import { EmailLayout, bodyText, bulletText, ctaStyle, signoffText } from "./shared-layout";

export interface QuickWinsEmailProps { firstName: string; companyName: string; verdict: string; score: number; appBaseUrl?: string; }

export function QuickWinsEmail({ firstName, companyName, verdict, score, appBaseUrl = "https://grantaq.com" }: QuickWinsEmailProps) {
  const isEligible = verdict === "eligible_now";
  return (
    <EmailLayout preview={`3 Quick Wins You Can Do This Week, ${firstName}`} headerSubtitle="Quick Wins">
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>
        Two days ago, your eligibility report for <strong>{companyName}</strong> came back with a readiness score of <strong>{score}/100</strong>.
        {isEligible
          ? " You're already eligible — these quick wins will strengthen your applications."
          : " Here are 3 things you can do this week to start closing the gap:"}
      </Text>
      <Text style={bulletText}><strong>1. Open a dedicated business bank account</strong> — if you haven&apos;t already. Co-mingled finances is the #1 first-timer disqualifier. Any bank, any account type. Takes 30 minutes. Free.</Text>
      <Text style={bulletText}><strong>2. Get your EIN</strong> — if you don&apos;t have one. IRS.gov, 15 minutes, completely free. You can&apos;t apply for any grant without it.</Text>
      <Text style={bulletText}><strong>3. Start your SAM.gov registration</strong> — this takes 2-4 weeks for IRS validation, so start now even if you&apos;re not applying yet. It&apos;s free. SAM.gov is the gateway to all federal grants.</Text>
      <Text style={bodyText}>Each of these costs $0 and takes under an hour. But skipping them blocks thousands of dollars in grant eligibility.</Text>
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={`${appBaseUrl}/services/readiness-diagnostic`} style={ctaStyle}>View Your Full Report</Button>
      </Section>
      <Text style={signoffText}>The GrantAQ Team</Text>
    </EmailLayout>
  );
}
