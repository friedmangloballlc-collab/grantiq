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

export interface ReadinessNudgeProps {
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
const AMBER_600 = "#D97706";

export function ReadinessNudge({
  userName,
  orgName,
  appBaseUrl = "https://app.grantiq.com",
  unsubscribeUrl,
}: ReadinessNudgeProps) {
  const resolvedUnsubscribeUrl = unsubscribeUrl ?? `${appBaseUrl}/settings#notifications`;
  const readinessUrl = `${appBaseUrl}/readiness`;

  return (
    <Html lang="en">
      <Head />
      <Preview>68% of grant rejections trace to organizational gaps — not weak proposals. Find yours in 5 minutes.</Preview>

      <Body style={{ backgroundColor: WARM_50, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>

          {/* Header */}
          <Section style={{ backgroundColor: TEAL, padding: "28px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
              GrantIQ
            </Text>
            <Heading style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, margin: 0, lineHeight: "1.3" }}>
              The one thing most grant seekers skip
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ padding: "28px 40px 0" }}>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              Hi {userName},
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              Most organizations jump straight to searching for grants. The ones that win spend 15 minutes on something most people skip entirely.
            </Text>

            {/* Stat callout */}
            <div
              style={{
                backgroundColor: "#FFF7ED",
                border: `1px solid #FED7AA`,
                borderLeft: `4px solid ${AMBER_600}`,
                borderRadius: 8,
                padding: "16px 20px",
                margin: "0 0 20px",
              }}
            >
              <Text style={{ color: WARM_900, fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>
                68% of grant rejections
              </Text>
              <Text style={{ color: WARM_700, fontSize: 14, margin: 0 }}>
                trace to organizational gaps — not weak proposals. Missing documents, unverified registrations, financial readiness issues. Things that can be fixed <em>before</em> you apply.
              </Text>
            </div>

            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              Your Readiness Score surfaces exactly those gaps. It takes 5 minutes, and it shows you which grants you qualify for right now — and what&apos;s blocking the others.
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 24px" }}>
              You haven&apos;t run yours yet. Here&apos;s the link:
            </Text>

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
              Run My Readiness Score
            </Button>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "28px 40px 32px" }}>
            <Hr style={{ borderColor: WARM_200, margin: "0 0 20px" }} />
            <Text style={{ color: WARM_500, fontSize: 12, margin: 0 }}>
              You&apos;re receiving this as part of your GrantIQ onboarding for {orgName}.
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

export default ReadinessNudge;
