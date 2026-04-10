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

export interface WritingIntroProps {
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

export function WritingIntro({
  userName,
  orgName,
  appBaseUrl = "https://app.grantaq.com",
  unsubscribeUrl,
}: WritingIntroProps) {
  const resolvedUnsubscribeUrl = unsubscribeUrl ?? `${appBaseUrl}/settings#notifications`;
  const writingUrl = `${appBaseUrl}/writing`;

  const tiers = [
    {
      name: "Guided Drafts",
      description: "AI generates a full first draft from your profile. You edit and submit.",
      best: "Teams with writing capacity who want a strong starting point",
    },
    {
      name: "Collaborative Writing",
      description: "AI writes section-by-section with your input at each stage. Produces tighter, more tailored narratives.",
      best: "Organizations preparing competitive applications for high-value grants",
    },
    {
      name: "Full Confidence",
      description: "Done-for-you writing with expert review. $0 upfront, 10% of awarded amount.",
      best: "When you need the best shot at a significant grant with no risk",
    },
  ];

  return (
    <Html lang="en">
      <Head />
      <Preview>The AI Writing Engine can draft your entire grant application — here&apos;s how the three tiers work.</Preview>

      <Body style={{ backgroundColor: WARM_50, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>

          {/* Header */}
          <Section style={{ backgroundColor: TEAL, padding: "28px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
              GrantAQ
            </Text>
            <Heading style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, margin: 0, lineHeight: "1.3" }}>
              Ready to write? Here&apos;s how the AI Writing Engine works
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ padding: "28px 40px 0" }}>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              Hi {userName},
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              Writing a grant application from scratch takes an average of 40 hours for a competitive federal proposal. The GrantAQ Writing Engine cuts that to a fraction — by using your organization&apos;s own profile, mission, and program data as the foundation.
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 24px" }}>
              There are three ways to use it, depending on your needs:
            </Text>

            {/* Tiers */}
            {tiers.map((tier, i) => (
              <div
                key={i}
                style={{
                  border: `1px solid ${WARM_200}`,
                  borderRadius: 8,
                  padding: "16px 20px",
                  marginBottom: 12,
                }}
              >
                <Row>
                  <Column>
                    <Text style={{ color: WARM_900, fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>
                      {tier.name}
                    </Text>
                    <Text style={{ color: WARM_700, fontSize: 14, margin: "0 0 6px" }}>
                      {tier.description}
                    </Text>
                    <Text style={{ color: WARM_500, fontSize: 13, margin: 0 }}>
                      Best for: {tier.best}
                    </Text>
                  </Column>
                </Row>
              </div>
            ))}

            <Text style={{ color: WARM_700, fontSize: 15, margin: "20px 0 24px" }}>
              You can start with any tier — and move between them for different grants. The dashboard shows your matched grants with a &quot;Start Writing&quot; option on each one.
            </Text>

            <Button
              href={writingUrl}
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
              Open the Writing Engine
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

export default WritingIntro;
