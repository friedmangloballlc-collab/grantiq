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
  Row,
  Column,
  Section,
  Text,
} from "@react-email/components";

export interface TrialEndingProps {
  userName: string;
  orgName: string;
  matchCount: number;
  pipelineCount: number;
  readinessScore?: number;
  appBaseUrl?: string;
  unsubscribeUrl?: string;
}

const TEAL = "#0D9488";
const WARM_900 = "#1C1917";
const WARM_700 = "#44403C";
const WARM_500 = "#78716C";
const WARM_200 = "#E7E5E4";
const WARM_50 = "#FAFAF9";

export function TrialEnding({
  userName,
  orgName,
  matchCount,
  pipelineCount,
  readinessScore,
  appBaseUrl = "https://app.grantiq.com",
  unsubscribeUrl,
}: TrialEndingProps) {
  const resolvedUnsubscribeUrl = unsubscribeUrl ?? `${appBaseUrl}/settings#notifications`;
  const upgradeUrl = `${appBaseUrl}/upgrade`;

  return (
    <Html lang="en">
      <Head />
      <Preview>Your free trial ends in 48 hours — here&apos;s what you&apos;ve built in GrantIQ.</Preview>

      <Body style={{ backgroundColor: WARM_50, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>

          {/* Header */}
          <Section style={{ backgroundColor: TEAL, padding: "28px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
              GrantIQ
            </Text>
            <Heading style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, margin: 0, lineHeight: "1.3" }}>
              Your free trial ends in 48 hours
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
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 24px" }}>
              Your 14-day trial ends in 48 hours. Here&apos;s what&apos;s in your account right now:
            </Text>

            {/* Stats row */}
            <div
              style={{
                border: `1px solid ${WARM_200}`,
                borderRadius: 8,
                padding: "20px 24px",
                margin: "0 0 24px",
              }}
            >
              <Row>
                <Column style={{ textAlign: "center", borderRight: `1px solid ${WARM_200}`, paddingRight: 16 }}>
                  <Text style={{ color: TEAL, fontSize: 32, fontWeight: 800, margin: "0 0 4px", lineHeight: 1 }}>
                    {matchCount}
                  </Text>
                  <Text style={{ color: WARM_500, fontSize: 13, margin: 0 }}>
                    Grant Matches
                  </Text>
                </Column>
                <Column style={{ textAlign: "center", borderRight: pipelineCount > 0 ? `1px solid ${WARM_200}` : undefined, padding: "0 16px" }}>
                  <Text style={{ color: TEAL, fontSize: 32, fontWeight: 800, margin: "0 0 4px", lineHeight: 1 }}>
                    {pipelineCount}
                  </Text>
                  <Text style={{ color: WARM_500, fontSize: 13, margin: 0 }}>
                    In Pipeline
                  </Text>
                </Column>
                {readinessScore !== undefined && (
                  <Column style={{ textAlign: "center", paddingLeft: 16 }}>
                    <Text style={{ color: TEAL, fontSize: 32, fontWeight: 800, margin: "0 0 4px", lineHeight: 1 }}>
                      {readinessScore}
                    </Text>
                    <Text style={{ color: WARM_500, fontSize: 13, margin: 0 }}>
                      Readiness Score
                    </Text>
                  </Column>
                )}
              </Row>
            </div>

            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              When your trial ends, your data stays safe — but you&apos;ll lose access to new matches, pipeline tracking, and the AI Writing Engine.
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 24px" }}>
              Continuing costs less than a single grant writer&apos;s hourly rate.
            </Text>

            <Button
              href={upgradeUrl}
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
              Continue with GrantIQ
            </Button>

            <Text style={{ color: WARM_500, fontSize: 13, margin: "16px 0 0" }}>
              Questions? Reply to this email — we&apos;re here.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "28px 40px 32px" }}>
            <Hr style={{ borderColor: WARM_200, margin: "0 0 20px" }} />
            <Text style={{ color: WARM_500, fontSize: 12, margin: 0 }}>
              You&apos;re receiving this because your GrantIQ trial for {orgName} is ending soon.
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

export default TrialEnding;
