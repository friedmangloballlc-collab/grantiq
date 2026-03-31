import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface CalendarIntroProps {
  userName: string;
  orgName: string;
  upcomingDeadlineCount?: number;
  appBaseUrl?: string;
  unsubscribeUrl?: string;
}

const TEAL = "#0D9488";
const WARM_900 = "#1C1917";
const WARM_700 = "#44403C";
const WARM_500 = "#78716C";
const WARM_200 = "#E7E5E4";
const WARM_50 = "#FAFAF9";

export function CalendarIntro({
  userName,
  orgName,
  upcomingDeadlineCount,
  appBaseUrl = "https://app.grantaq.com",
  unsubscribeUrl,
}: CalendarIntroProps) {
  const resolvedUnsubscribeUrl = unsubscribeUrl ?? `${appBaseUrl}/settings#notifications`;
  const pipelineUrl = `${appBaseUrl}/pipeline`;

  return (
    <Html lang="en">
      <Head />
      <Preview>The grant calendar problem: most organizations miss deadlines they never knew existed. Here&apos;s a 10-minute fix.</Preview>

      <Body style={{ backgroundColor: WARM_50, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>

          {/* Header */}
          <Section style={{ backgroundColor: TEAL, padding: "28px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
              GrantAQ
            </Text>
            <Heading style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, margin: 0, lineHeight: "1.3" }}>
              The grant calendar problem
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ padding: "28px 40px 0" }}>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              Hi {userName},
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              Most organizations miss grant deadlines for one of three reasons:
            </Text>

            <div style={{ margin: "0 0 20px" }}>
              {[
                "They didn't know the grant existed until after the deadline passed.",
                "They knew about it but didn't start writing early enough.",
                "The deadline shifted and nobody updated the calendar.",
              ].map((reason, i) => (
                <div key={i} style={{ display: "flex", marginBottom: 10 }}>
                  <Text style={{ color: TEAL, fontSize: 15, fontWeight: 700, margin: "0 12px 0 0", minWidth: 20 }}>
                    {i + 1}.
                  </Text>
                  <Text style={{ color: WARM_700, fontSize: 15, margin: 0 }}>
                    {reason}
                  </Text>
                </div>
              ))}
            </div>

            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              The Pipeline Tracker solves all three. When you add a grant to your pipeline, it automatically:
            </Text>

            <div
              style={{
                border: `1px solid ${WARM_200}`,
                borderRadius: 8,
                padding: "16px 20px",
                margin: "0 0 20px",
              }}
            >
              {[
                "Tracks the deadline and alerts you when it's approaching",
                "Shows the writing and review time you'll need to work backward from",
                "Syncs with your matched grants so nothing falls through the cracks",
              ].map((item, i) => (
                <Text key={i} style={{ color: WARM_700, fontSize: 14, margin: "0 0 8px" }}>
                  ✓ {item}
                </Text>
              ))}
            </div>

            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 24px" }}>
              {upcomingDeadlineCount && upcomingDeadlineCount > 0
                ? `You already have ${upcomingDeadlineCount} deadline${upcomingDeadlineCount > 1 ? "s" : ""} in your pipeline. Set up your tracking now so you don't miss them.`
                : "It takes about 10 minutes to set up. Here's your pipeline:"}
            </Text>

            <Button
              href={pipelineUrl}
              style={{
                backgroundColor: TEAL,
                color: "#ffffff",
                borderRadius: 8,
                padding: "12px 28px",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Open My Grant Pipeline
            </Button>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "28px 40px 32px" }}>
            <Hr style={{ borderColor: WARM_200, margin: "0 0 20px" }} />
            <Text style={{ color: WARM_500, fontSize: 12, margin: 0 }}>
              You&apos;re receiving this as part of your GrantAQ onboarding for {orgName}.
            </Text>
            <Text style={{ color: WARM_500, fontSize: 12, margin: "6px 0 0" }}>
              <Link href={resolvedUnsubscribeUrl} style={{ color: WARM_500 }}>Unsubscribe</Link>
              {" · "}
              <Link href="https://grantaq.com" style={{ color: WARM_500 }}>GrantAQ</Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

export default CalendarIntro;
