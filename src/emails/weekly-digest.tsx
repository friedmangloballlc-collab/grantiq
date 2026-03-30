import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";

interface DigestProps {
  userName: string;
  newMatches: Array<{
    name: string;
    funder: string;
    score: number;
    amount: string;
    url: string;
  }>;
  upcomingDeadlines: Array<{
    name: string;
    deadline: string;
    daysLeft: number;
  }>;
}

export function WeeklyDigest({ userName, newMatches, upcomingDeadlines }: DigestProps) {
  return (
    <Html>
      <Head />
      <Preview>Your weekly grant digest from GrantIQ</Preview>
      <Body style={{ backgroundColor: "#FAFAF9", fontFamily: "Inter, sans-serif" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
          <Heading style={{ color: "#0D9488", fontSize: 24 }}>GrantIQ Weekly Digest</Heading>
          <Text style={{ color: "#57534E" }}>
            Hi {userName}, here&apos;s your weekly update:
          </Text>

          {newMatches.length > 0 && (
            <Section>
              <Heading as="h2" style={{ fontSize: 18, color: "#1C1917" }}>
                New Matches ({newMatches.length})
              </Heading>
              {newMatches.map((m, i) => (
                <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid #E7E5E4" }}>
                  <Link href={m.url} style={{ color: "#0D9488", fontWeight: 600 }}>
                    {m.name}
                  </Link>
                  <Text style={{ margin: "4px 0 0", color: "#57534E", fontSize: 14 }}>
                    {m.funder} | {m.amount} | {m.score}% match
                  </Text>
                </div>
              ))}
            </Section>
          )}

          {upcomingDeadlines.length > 0 && (
            <Section style={{ marginTop: 20 }}>
              <Heading as="h2" style={{ fontSize: 18, color: "#1C1917" }}>
                Upcoming Deadlines
              </Heading>
              {upcomingDeadlines.map((d, i) => (
                <Text
                  key={i}
                  style={{ color: d.daysLeft <= 7 ? "#DC2626" : "#57534E", fontSize: 14 }}
                >
                  {d.name} — {d.deadline} ({d.daysLeft} days left)
                </Text>
              ))}
            </Section>
          )}

          <Hr style={{ margin: "24px 0" }} />
          <Link href="https://grantiq.com/dashboard" style={{ color: "#0D9488" }}>
            View all in your dashboard
          </Link>
        </Container>
      </Body>
    </Html>
  );
}
