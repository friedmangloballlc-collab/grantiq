import { Text, Button, Section } from "@react-email/components";
import { EmailLayout, bodyText, bulletText, ctaStyle, signoffText } from "./shared-layout";

export interface TierOnboardingProps {
  firstName: string;
  tierName: string;
  tierNumber: number;
  timeline: string;
  steps: string[];
  deliverables: string[];
  calendarUrl: string;
  appBaseUrl?: string;
}

export function TierOnboarding({ firstName, tierName, tierNumber, timeline, steps, deliverables, calendarUrl, appBaseUrl = "https://grantaq.com" }: TierOnboardingProps) {
  return (
    <EmailLayout preview={`Welcome — your ${tierName} engagement begins`} headerSubtitle={`Welcome to ${tierName}`}>
      <Text style={bodyText}>Hi {firstName},</Text>
      <Text style={bodyText}>Welcome aboard. Payment received — your <strong>{tierName}</strong> is officially in motion.</Text>
      <Text style={{ ...bodyText, fontWeight: 600 }}>What happens over the next {timeline}:</Text>
      {steps.map((s, i) => <Text key={i} style={bulletText}>• {s}</Text>)}
      <Text style={{ ...bodyText, fontWeight: 600, marginTop: 16 }}>What you&apos;ll receive:</Text>
      {deliverables.map((d, i) => <Text key={i} style={bulletText}>• {d}</Text>)}
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={calendarUrl} style={ctaStyle}>
          {tierNumber >= 3 ? "Book Your Kickoff Call" : "Schedule Your Walkthrough"}
        </Button>
      </Section>
      <Text style={bodyText}>
        If you have any questions before we get started, reply to this email.
      </Text>
      <Text style={signoffText}>Let&apos;s get you grant-ready,<br />The GrantAQ Team</Text>
    </EmailLayout>
  );
}

// Pre-built configs for each tier
export const TIER_CONFIGS: Record<number, { tierName: string; timeline: string; steps: string[]; deliverables: string[] }> = {
  1: {
    tierName: "Tier 1 — Readiness & Eligibility Review",
    timeline: "5–7 business days",
    steps: [
      "Within 24 hours: Short intake checklist for additional documents",
      "3–5 business days after docs received: Full diagnostic report delivered",
      "45-minute walkthrough call to review every finding",
    ],
    deliverables: [
      "Complete Grant Eligibility & Readiness Diagnostic",
      "5-layer readiness audit with remediation blocks",
      "Risk & red flag screen",
      "Funder-matched target list",
      "45-minute walkthrough call",
    ],
  },
  2: {
    tierName: "Tier 2 — Readiness Assessment + Remediation Roadmap",
    timeline: "2–3 weeks",
    steps: [
      "Week 1: Kickoff call (60 min) + intake document collection + deep-dive analysis",
      "Week 2: Remediation playbook drafted with templates, vendor directory, and funder-matched target list",
      "Week 3: Midpoint strategy call (60 min) + delivery of full roadmap package",
    ],
    deliverables: [
      "Everything in Tier 1",
      "Step-by-step remediation playbook",
      "Policy templates and compliance checklists",
      "Vendor directory for CPA, attorneys, insurance",
      "First-timer-friendly funder list with application timelines",
      "2 strategy calls (60 min each)",
      "30-day email support",
    ],
  },
  3: {
    tierName: "Tier 3 — Readiness Accelerator",
    timeline: "60–120 days",
    steps: [
      "Week 1: Kickoff + comprehensive document audit",
      "Weeks 2–4: SAM.gov and UEI registration completed",
      "Weeks 3–6: All required policies drafted and adopted",
      "Weeks 4–8: Logic model, SMART objectives, evaluation framework built",
      "Weeks 6–10: Indirect cost rate election, capability statement",
      "Weeks 10–12: First starter-grant application drafted and submitted",
    ],
    deliverables: [
      "Everything in Tier 2",
      "SAM.gov and UEI registration (we do it for you)",
      "All policies drafted and ready for adoption",
      "Project logic model and evaluation plan",
      "Indirect cost rate election filed",
      "Capability statement / case for support",
      "Pre-qualified grant list with 5+ first-timer-friendly programs",
      "First starter-grant application drafted",
      "Weekly working sessions",
      "Priority email support throughout",
    ],
  },
  4: {
    tierName: "Strategic Restructuring Engagement",
    timeline: "2–4 weeks",
    steps: [
      "This week: Book your 60-minute strategy call",
      "Week 1: Structural fit analysis — grant eligibility vs alternative capital",
      "Week 2: Restructuring options with cost/timeline/impact analysis",
      "Week 3–4: Decision-ready recommendation + implementation roadmap",
    ],
    deliverables: [
      "Structural fit analysis report",
      "Restructuring options table (501c3, fiscal sponsorship, reincorporation, etc.)",
      "Alternative capital roadmap (R&D credits, SBA loans, CDFI, crowdfunding)",
      "60-minute strategy call",
      "Clear recommendation tied to your specific situation",
    ],
  },
};
