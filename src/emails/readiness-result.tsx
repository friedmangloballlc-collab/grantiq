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

export interface ReadinessResultProps {
  userName: string;
  orgName: string;
  readinessScore: number;
  qualifiedGrantCount: number;
  topBlocker?: string;
  appBaseUrl?: string;
  unsubscribeUrl?: string;
}

const TEAL = "#0D9488";
const WARM_900 = "#1C1917";
const WARM_700 = "#44403C";
const WARM_500 = "#78716C";
const WARM_200 = "#E7E5E4";
const WARM_50 = "#FAFAF9";
const GREEN_600 = "#16A34A";
const AMBER_600 = "#D97706";
const RED_600 = "#DC2626";

function scoreColor(score: number): string {
  if (score >= 75) return GREEN_600;
  if (score >= 50) return AMBER_600;
  return RED_600;
}

function scoreLabel(score: number): string {
  if (score >= 75) return "Strong";
  if (score >= 50) return "Developing";
  return "Needs Work";
}

export function ReadinessResult({
  userName,
  orgName,
  readinessScore,
  qualifiedGrantCount,
  topBlocker,
  appBaseUrl = "https://app.grantiq.com",
  unsubscribeUrl,
}: ReadinessResultProps) {
  const resolvedUnsubscribeUrl = unsubscribeUrl ?? `${appBaseUrl}/settings#notifications`;
  const dashboardUrl = `${appBaseUrl}/dashboard`;
  const color = scoreColor(readinessScore);

  return (
    <Html lang="en">
      <Head />
      <Preview>Your Readiness Score is {readinessScore} — {scoreLabel(readinessScore)}. Here&apos;s what it means for your grant eligibility.</Preview>

      <Body style={{ backgroundColor: WARM_50, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>

          {/* Header */}
          <Section style={{ backgroundColor: TEAL, padding: "28px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
              GrantIQ
            </Text>
            <Heading style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, margin: 0, lineHeight: "1.3" }}>
              Your readiness score is in
            </Heading>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, margin: "6px 0 0" }}>
              {orgName}
            </Text>
          </Section>

          {/* Score display */}
          <Section style={{ padding: "28px 40px 0", textAlign: "center" }}>
            <Text style={{ color: WARM_500, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
              Your Readiness Score
            </Text>
            <Text style={{ color, fontSize: 64, fontWeight: 800, margin: "0 0 4px", lineHeight: 1 }}>
              {readinessScore}
            </Text>
            <Text style={{ color, fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>
              {scoreLabel(readinessScore)}
            </Text>
          </Section>

          {/* Interpretation */}
          <Section style={{ padding: "0 40px" }}>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              Hi {userName}, here&apos;s what your score means:
            </Text>

            <div
              style={{
                border: `1px solid ${WARM_200}`,
                borderLeft: `4px solid ${color}`,
                borderRadius: 8,
                padding: "16px 20px",
                margin: "0 0 20px",
              }}
            >
              <Text style={{ color: WARM_900, fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>
                {qualifiedGrantCount > 0
                  ? `${qualifiedGrantCount} grants match your current profile`
                  : "Build your profile to unlock matches"}
              </Text>
              <Text style={{ color: WARM_700, fontSize: 14, margin: 0 }}>
                {readinessScore >= 75
                  ? "Your organization has the baseline credentials and documentation that funders look for. You're well-positioned to apply."
                  : readinessScore >= 50
                  ? "You qualify for a solid set of grants now, with more available once you address a few gaps."
                  : "There are grants available at your current stage, and addressing key gaps will significantly expand your options."}
              </Text>
            </div>

            {topBlocker && (
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
                <Text style={{ color: WARM_900, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>
                  Top item to address:
                </Text>
                <Text style={{ color: WARM_700, fontSize: 14, margin: 0 }}>
                  {topBlocker}
                </Text>
              </div>
            )}

            <Button
              href={dashboardUrl}
              style={{
                backgroundColor: TEAL,
                color: "#ffffff",
                borderRadius: 8,
                padding: "12px 28px",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-block",
                marginBottom: 28,
              }}
            >
              View Your Dashboard
            </Button>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "0 40px 32px" }}>
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

export default ReadinessResult;
