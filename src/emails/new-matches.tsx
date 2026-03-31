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

export interface NewMatchGrant {
  id: string;
  name: string;
  funder: string;
  score: number;
  amount: string;
  deadline: string;
}

export interface NewMatchesProps {
  userName: string;
  orgName: string;
  newMatchCount: number;
  topMatches: NewMatchGrant[];
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

function scoreColor(score: number): string {
  if (score >= 90) return GREEN_600;
  if (score >= 75) return TEAL;
  return WARM_700;
}

export function NewMatches({
  userName,
  orgName,
  newMatchCount,
  topMatches,
  appBaseUrl = "https://app.grantiq.com",
  unsubscribeUrl,
}: NewMatchesProps) {
  const resolvedUnsubscribeUrl = unsubscribeUrl ?? `${appBaseUrl}/settings#notifications`;
  const matchesUrl = `${appBaseUrl}/matches`;

  return (
    <Html lang="en">
      <Head />
      <Preview>{newMatchCount} new grant match{newMatchCount !== 1 ? "es" : ""} since your last visit — some with upcoming deadlines.</Preview>

      <Body style={{ backgroundColor: WARM_50, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>

          {/* Header */}
          <Section style={{ backgroundColor: TEAL, padding: "28px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
              GrantIQ
            </Text>
            <Heading style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, margin: 0, lineHeight: "1.3" }}>
              {newMatchCount} new grant match{newMatchCount !== 1 ? "es" : ""} since your last visit
            </Heading>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, margin: "6px 0 0" }}>
              {orgName}
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "28px 40px 0" }}>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 24px" }}>
              Hi {userName}, your grant profile has been actively matching in the background. Here&apos;s what&apos;s new:
            </Text>

            {/* Top matches */}
            {topMatches.length > 0 && (
              <>
                <Heading as="h2" style={{ color: WARM_900, fontSize: 16, fontWeight: 700, margin: "0 0 4px", borderBottom: `2px solid ${TEAL}`, paddingBottom: 8 }}>
                  Your Top New Matches
                </Heading>
                <Text style={{ color: WARM_500, fontSize: 13, margin: "4px 0 16px" }}>
                  Ranked by fit score
                </Text>

                {topMatches.map((match) => (
                  <Row key={match.id} style={{ borderBottom: `1px solid ${WARM_200}`, paddingBottom: 14, marginBottom: 14 }}>
                    <Column>
                      <Link
                        href={`${appBaseUrl}/grants/${match.id}`}
                        style={{ color: TEAL, fontWeight: 600, fontSize: 15, textDecoration: "none" }}
                      >
                        {match.name}
                      </Link>
                      <Text style={{ color: WARM_500, fontSize: 13, margin: "3px 0 0" }}>
                        {match.funder}
                      </Text>
                      <Row style={{ marginTop: 6 }}>
                        <Column>
                          <Text style={{ color: scoreColor(match.score), fontSize: 13, fontWeight: 700, margin: 0 }}>
                            {match.score}% match
                          </Text>
                        </Column>
                        <Column>
                          <Text style={{ color: WARM_700, fontSize: 13, margin: 0 }}>
                            {match.amount}
                          </Text>
                        </Column>
                        <Column>
                          <Text style={{ color: WARM_500, fontSize: 13, margin: 0 }}>
                            Due {match.deadline}
                          </Text>
                        </Column>
                      </Row>
                    </Column>
                  </Row>
                ))}
              </>
            )}

            <Button
              href={matchesUrl}
              style={{
                backgroundColor: TEAL,
                color: "#ffffff",
                borderRadius: 8,
                padding: "12px 28px",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-block",
                marginTop: 8,
              }}
            >
              View All {newMatchCount} New Matches
            </Button>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "28px 40px 32px" }}>
            <Hr style={{ borderColor: WARM_200, margin: "0 0 20px" }} />
            <Text style={{ color: WARM_500, fontSize: 12, margin: 0 }}>
              You&apos;re receiving this because you haven&apos;t logged in to GrantIQ recently.
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

export default NewMatches;
