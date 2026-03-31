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

export interface WelcomeProps {
  userName: string;
  orgName: string;
  appBaseUrl?: string;
  unsubscribeUrl?: string;
}

const TEAL = "#0D9488";
const WARM_900 = "#1C1917";
const WARM_700 = "#44403C";
const WARM_500 = "#78716C";
const WARM_200 = "#E7E5E4";
const WARM_50 = "#FAFAF9";

export function Welcome({
  userName,
  orgName,
  appBaseUrl = "https://app.grantiq.com",
  unsubscribeUrl,
}: WelcomeProps) {
  const resolvedUnsubscribeUrl = unsubscribeUrl ?? `${appBaseUrl}/settings#notifications`;
  const readinessUrl = `${appBaseUrl}/readiness`;

  return (
    <Html lang="en">
      <Head />
      <Preview>Welcome to GrantIQ — run your Readiness Score to see which grants you qualify for today.</Preview>

      <Body style={{ backgroundColor: WARM_50, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>

          {/* Header */}
          <Section style={{ backgroundColor: TEAL, padding: "28px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
              GrantIQ
            </Text>
            <Heading style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, margin: 0, lineHeight: "1.3" }}>
              Your account is ready
            </Heading>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, margin: "6px 0 0" }}>
              {orgName}
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "28px 40px 0" }}>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              Hi {userName},
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              Welcome to GrantIQ. You&apos;re now set up to discover, track, and apply for grants matched to your organization — built on the same methodology used by professional grant consultants.
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 24px" }}>
              The first thing to do: run your <strong>Readiness Score</strong>. It takes about 5 minutes and tells you exactly which grants you qualify for today — and what&apos;s blocking the rest.
            </Text>

            {/* CTA */}
            <Button
              href={readinessUrl}
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
              Run Your Readiness Score
            </Button>
          </Section>

          {/* What you get section */}
          <Section style={{ padding: "28px 40px 0" }}>
            <Heading as="h2" style={{ color: WARM_900, fontSize: 16, fontWeight: 700, margin: "0 0 16px", borderBottom: `2px solid ${TEAL}`, paddingBottom: 8 }}>
              Here&apos;s what&apos;s waiting for you
            </Heading>

            <div style={{ marginBottom: 12 }}>
              <Text style={{ color: WARM_900, fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>
                Grant Discovery
              </Text>
              <Text style={{ color: WARM_700, fontSize: 14, margin: 0 }}>
                AI-matched grants from federal, state, and foundation sources — scored against your profile.
              </Text>
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text style={{ color: WARM_900, fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>
                Pipeline Tracker
              </Text>
              <Text style={{ color: WARM_700, fontSize: 14, margin: 0 }}>
                Manage every application from &quot;researching&quot; to &quot;awarded&quot; in one place.
              </Text>
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text style={{ color: WARM_900, fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>
                AI Writing Engine
              </Text>
              <Text style={{ color: WARM_700, fontSize: 14, margin: 0 }}>
                Draft grant narratives, cover letters, and budgets using your organization&apos;s own context.
              </Text>
            </div>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "28px 40px 32px" }}>
            <Hr style={{ borderColor: WARM_200, margin: "0 0 20px" }} />
            <Text style={{ color: WARM_500, fontSize: 12, margin: 0 }}>
              You&apos;re receiving this because you created a GrantIQ account for {orgName}.
            </Text>
            <Text style={{ color: WARM_500, fontSize: 12, margin: "6px 0 0" }}>
              <Link href={resolvedUnsubscribeUrl} style={{ color: WARM_500 }}>Unsubscribe</Link>
              {" · "}
              <Link href="https://grantiq.com" style={{ color: WARM_500 }}>GrantIQ</Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

export default Welcome;
