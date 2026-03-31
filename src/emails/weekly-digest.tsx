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

export interface DigestMatch {
  id: string;
  name: string;
  funder: string;
  score: number;
  amount: string;
  deadline: string;
  url: string;
}

export interface DigestDeadline {
  id: string;
  name: string;
  deadline: string;
  daysLeft: number;
  stage: string;
}

export type ActionItem =
  | { type: "missing_docs"; docName: string; grantsUnlocked: number }
  | { type: "unreviewed_match"; grantName: string; score: number; grantId: string }
  | { type: "stale_pipeline"; grantName: string; daysSinceUpdate: number; pipelineId: string }
  | { type: "none" };

export interface WeeklyDigestProps {
  orgName: string;
  userName: string;
  newMatches: DigestMatch[];
  upcomingDeadlines: DigestDeadline[];
  actionItem: ActionItem;
  appBaseUrl?: string;
  settingsUrl?: string;
  unsubscribeUrl?: string;
}

const TEAL = "#0D9488";
const WARM_900 = "#1C1917";
const WARM_700 = "#44403C";
const WARM_500 = "#78716C";
const WARM_200 = "#E7E5E4";
const WARM_50 = "#FAFAF9";
const RED_600 = "#DC2626";
const AMBER_600 = "#D97706";
const GREEN_600 = "#16A34A";

function formatAmount(amount: string): string {
  return amount ?? "Amount varies";
}

function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    researching: "Researching",
    preparing: "Preparing",
    writing: "Writing",
    submitted: "Submitted",
    awarded: "Awarded",
    declined: "Declined",
  };
  return labels[stage] ?? stage;
}

function deadlineColor(daysLeft: number): string {
  if (daysLeft <= 3) return RED_600;
  if (daysLeft <= 7) return AMBER_600;
  return WARM_700;
}

function scoreColor(score: number): string {
  if (score >= 90) return GREEN_600;
  if (score >= 75) return TEAL;
  return WARM_700;
}

export function WeeklyDigest({
  orgName,
  userName,
  newMatches,
  upcomingDeadlines,
  actionItem,
  appBaseUrl = "https://app.grantaq.com",
  settingsUrl,
  unsubscribeUrl,
}: WeeklyDigestProps) {
  const resolvedSettingsUrl = settingsUrl ?? `${appBaseUrl}/settings`;
  const resolvedUnsubscribeUrl = unsubscribeUrl ?? `${appBaseUrl}/settings#notifications`;
  const dashboardUrl = `${appBaseUrl}/dashboard`;
  const hasContent = newMatches.length > 0 || upcomingDeadlines.length > 0;

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {hasContent
          ? `${newMatches.length > 0 ? `${newMatches.length} new grant match${newMatches.length > 1 ? "es" : ""}` : ""}${newMatches.length > 0 && upcomingDeadlines.length > 0 ? " · " : ""}${upcomingDeadlines.length > 0 ? `${upcomingDeadlines.length} upcoming deadline${upcomingDeadlines.length > 1 ? "s" : ""}` : ""} — GrantAQ Weekly Digest`
          : "Your weekly grant update from GrantAQ"}
      </Preview>

      <Body style={{ backgroundColor: WARM_50, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>

          {/* Header */}
          <Section style={{ backgroundColor: TEAL, padding: "28px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
              GrantAQ
            </Text>
            <Heading style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, margin: 0, lineHeight: "1.3" }}>
              Your Weekly Grant Digest
            </Heading>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, margin: "6px 0 0" }}>
              {orgName}
            </Text>
          </Section>

          {/* Greeting */}
          <Section style={{ padding: "24px 40px 0" }}>
            <Text style={{ color: WARM_700, fontSize: 15, margin: 0 }}>
              Hi {userName}, here&apos;s what&apos;s new in your grant pipeline this week.
            </Text>
          </Section>

          {/* ── Section 1: New Matches ── */}
          {newMatches.length > 0 && (
            <Section style={{ padding: "24px 40px 0" }}>
              <Heading as="h2" style={{ color: WARM_900, fontSize: 16, fontWeight: 700, margin: "0 0 4px", borderBottom: `2px solid ${TEAL}`, paddingBottom: 8 }}>
                New Matches This Week
              </Heading>
              <Text style={{ color: WARM_500, fontSize: 13, margin: "4px 0 16px" }}>
                {newMatches.length} new grant{newMatches.length > 1 ? "s" : ""} matched your profile
              </Text>

              {newMatches.map((match) => (
                <Row key={match.id} style={{ borderBottom: `1px solid ${WARM_200}`, paddingBottom: 14, marginBottom: 14 }}>
                  <Column>
                    <Link
                      href={match.url || `${appBaseUrl}/grants/${match.id}`}
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
                          {formatAmount(match.amount)}
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

              <Button
                href={`${appBaseUrl}/matches`}
                style={{
                  backgroundColor: TEAL,
                  color: "#ffffff",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                  marginTop: 4,
                }}
              >
                View All Matches
              </Button>
            </Section>
          )}

          {/* ── Section 2: Upcoming Deadlines ── */}
          {upcomingDeadlines.length > 0 && (
            <Section style={{ padding: "24px 40px 0" }}>
              <Heading as="h2" style={{ color: WARM_900, fontSize: 16, fontWeight: 700, margin: "0 0 4px", borderBottom: `2px solid ${AMBER_600}`, paddingBottom: 8 }}>
                Upcoming Deadlines
              </Heading>
              <Text style={{ color: WARM_500, fontSize: 13, margin: "4px 0 16px" }}>
                Grants in your pipeline due in the next 14 days
              </Text>

              {upcomingDeadlines.map((item) => (
                <Row key={item.id} style={{ marginBottom: 12 }}>
                  <Column style={{ width: "60%" }}>
                    <Link
                      href={`${appBaseUrl}/pipeline`}
                      style={{ color: WARM_900, fontSize: 14, fontWeight: 600, textDecoration: "none" }}
                    >
                      {item.name}
                    </Link>
                    <Text style={{ color: WARM_500, fontSize: 12, margin: "2px 0 0" }}>
                      {stageLabel(item.stage)}
                    </Text>
                  </Column>
                  <Column style={{ width: "40%", textAlign: "right" }}>
                    <Text
                      style={{
                        color: deadlineColor(item.daysLeft),
                        fontSize: 14,
                        fontWeight: 700,
                        margin: 0,
                      }}
                    >
                      {item.daysLeft === 0
                        ? "Due today"
                        : item.daysLeft === 1
                        ? "Due tomorrow"
                        : `${item.daysLeft} days`}
                    </Text>
                    <Text style={{ color: WARM_500, fontSize: 12, margin: "2px 0 0" }}>
                      {item.deadline}
                    </Text>
                  </Column>
                </Row>
              ))}

              <Button
                href={`${appBaseUrl}/pipeline`}
                style={{
                  backgroundColor: AMBER_600,
                  color: "#ffffff",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                  marginTop: 8,
                }}
              >
                Open Pipeline
              </Button>
            </Section>
          )}

          {/* ── Section 3: Action Item ── */}
          {actionItem.type !== "none" && (
            <Section style={{ padding: "24px 40px 0" }}>
              <div
                style={{
                  backgroundColor: "#F0FDFA",
                  border: `1px solid #99F6E4`,
                  borderLeft: `4px solid ${TEAL}`,
                  borderRadius: 8,
                  padding: "16px 20px",
                }}
              >
                <Heading as="h2" style={{ color: TEAL, fontSize: 13, fontWeight: 700, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Your Action Item
                </Heading>

                {actionItem.type === "missing_docs" && (
                  <>
                    <Text style={{ color: WARM_900, fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>
                      Upload your {actionItem.docName} to unlock {actionItem.grantsUnlocked} more grant{actionItem.grantsUnlocked > 1 ? "s" : ""}
                    </Text>
                    <Text style={{ color: WARM_700, fontSize: 14, margin: "0 0 12px" }}>
                      Your profile is missing a key document that&apos;s blocking matches. Add it now to expand your opportunities.
                    </Text>
                    <Link href={`${appBaseUrl}/settings`} style={{ color: TEAL, fontSize: 14, fontWeight: 600 }}>
                      Upload document →
                    </Link>
                  </>
                )}

                {actionItem.type === "unreviewed_match" && (
                  <>
                    <Text style={{ color: WARM_900, fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>
                      Review your top match: {actionItem.grantName} ({actionItem.score}% fit)
                    </Text>
                    <Text style={{ color: WARM_700, fontSize: 14, margin: "0 0 12px" }}>
                      This high-scoring grant hasn&apos;t been reviewed yet. Act before the window closes.
                    </Text>
                    <Link href={`${appBaseUrl}/grants/${actionItem.grantId}`} style={{ color: TEAL, fontSize: 14, fontWeight: 600 }}>
                      Review grant →
                    </Link>
                  </>
                )}

                {actionItem.type === "stale_pipeline" && (
                  <>
                    <Text style={{ color: WARM_900, fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>
                      Your {actionItem.grantName} application hasn&apos;t been updated in {actionItem.daysSinceUpdate} days
                    </Text>
                    <Text style={{ color: WARM_700, fontSize: 14, margin: "0 0 12px" }}>
                      Keep momentum on this application. A quick update keeps your pipeline accurate and your team aligned.
                    </Text>
                    <Link href={`${appBaseUrl}/pipeline`} style={{ color: TEAL, fontSize: 14, fontWeight: 600 }}>
                      Update application →
                    </Link>
                  </>
                )}
              </div>
            </Section>
          )}

          {/* Empty state */}
          {!hasContent && (
            <Section style={{ padding: "32px 40px", textAlign: "center" }}>
              <Text style={{ color: WARM_500, fontSize: 15 }}>
                No new matches or upcoming deadlines this week. Keep building your profile to improve your match score.
              </Text>
              <Button
                href={dashboardUrl}
                style={{
                  backgroundColor: TEAL,
                  color: "#ffffff",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                  marginTop: 12,
                }}
              >
                Go to Dashboard
              </Button>
            </Section>
          )}

          {/* CTA banner */}
          {hasContent && (
            <Section style={{ padding: "24px 40px 0", textAlign: "center" }}>
              <Button
                href={dashboardUrl}
                style={{
                  backgroundColor: WARM_900,
                  color: "#ffffff",
                  borderRadius: 8,
                  padding: "12px 28px",
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Open Your Dashboard
              </Button>
            </Section>
          )}

          {/* Footer */}
          <Section style={{ padding: "24px 40px 32px" }}>
            <Hr style={{ borderColor: WARM_200, margin: "0 0 20px" }} />
            <Row>
              <Column>
                <Text style={{ color: WARM_500, fontSize: 12, margin: 0 }}>
                  You&apos;re receiving this because digest emails are enabled for {orgName}.
                </Text>
                <Text style={{ color: WARM_500, fontSize: 12, margin: "6px 0 0" }}>
                  <Link href={resolvedSettingsUrl} style={{ color: WARM_500 }}>
                    Manage preferences
                  </Link>
                  {" · "}
                  <Link href={resolvedUnsubscribeUrl} style={{ color: WARM_500 }}>
                    Unsubscribe
                  </Link>
                  {" · "}
                  <Link href="https://grantaq.com" style={{ color: WARM_500 }}>
                    GrantAQ
                  </Link>
                </Text>
              </Column>
            </Row>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

export default WeeklyDigest;
