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

export interface DiscoveryStoryProps {
  userName: string;
  orgName: string;
  newMatchCount?: number;
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

export function DiscoveryStory({
  userName,
  orgName,
  newMatchCount,
  appBaseUrl = "https://app.grantaq.com",
  unsubscribeUrl,
}: DiscoveryStoryProps) {
  const resolvedUnsubscribeUrl = unsubscribeUrl ?? `${appBaseUrl}/settings#notifications`;
  const matchesUrl = `${appBaseUrl}/matches`;

  return (
    <Html lang="en">
      <Head />
      <Preview>How a workforce development nonprofit found $340K in grants they never knew existed — and how you can too.</Preview>

      <Body style={{ backgroundColor: WARM_50, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>

          {/* Header */}
          <Section style={{ backgroundColor: TEAL, padding: "28px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
              GrantAQ
            </Text>
            <Heading style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, margin: 0, lineHeight: "1.3" }}>
              How they found grants they never knew existed
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ padding: "28px 40px 0" }}>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              Hi {userName},
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              A workforce development nonprofit — 12 staff, $1.2M annual budget — had been applying for the same four grants every year. They thought they&apos;d found everything available to them.
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              They hadn&apos;t.
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              Within their first week using AI-driven grant matching, they discovered 23 funding opportunities they&apos;d never encountered. Eleven were strong fits. Three were funded within the year — totaling $340,000.
            </Text>

            {/* Outcome callout */}
            <div
              style={{
                backgroundColor: "#F0FDF4",
                border: `1px solid #BBF7D0`,
                borderLeft: `4px solid ${GREEN_600}`,
                borderRadius: 8,
                padding: "16px 20px",
                margin: "0 0 20px",
              }}
            >
              <Text style={{ color: WARM_900, fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>
                What changed?
              </Text>
              <Text style={{ color: WARM_700, fontSize: 14, margin: 0 }}>
                Their profile was matched against thousands of active grants — including regional foundations, federal sub-programs, and industry-specific funds they had no way of tracking manually.
              </Text>
            </div>

            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              The grants were always there. They just didn&apos;t have a system that could surface them.
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 24px" }}>
              {newMatchCount && newMatchCount > 0
                ? `Your profile already has ${newMatchCount} match${newMatchCount > 1 ? "es" : ""}. Take a look:`
                : "Your matches are ready. Here's what's waiting:"}
            </Text>

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
              }}
            >
              View My Grant Matches
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

export default DiscoveryStory;
