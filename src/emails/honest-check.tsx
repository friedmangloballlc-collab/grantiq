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

export interface HonestCheckProps {
  userName: string;
  orgName: string;
  appBaseUrl?: string;
  unsubscribeUrl?: string;
}

const TEAL = "#0D9488";
const WARM_700 = "#44403C";
const WARM_500 = "#78716C";
const WARM_200 = "#E7E5E4";
const WARM_50 = "#FAFAF9";

export function HonestCheck({
  userName,
  orgName,
  appBaseUrl = "https://app.grantaq.com",
  unsubscribeUrl,
}: HonestCheckProps) {
  const resolvedUnsubscribeUrl = unsubscribeUrl ?? `${appBaseUrl}/settings#notifications`;
  const dashboardUrl = `${appBaseUrl}/dashboard`;

  return (
    <Html lang="en">
      <Head />
      <Preview>An honest question: is GrantAQ a fit for where you are right now?</Preview>

      <Body style={{ backgroundColor: WARM_50, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>

          {/* Header */}
          <Section style={{ backgroundColor: TEAL, padding: "28px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
              GrantAQ
            </Text>
            <Heading style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, margin: 0, lineHeight: "1.3" }}>
              Is GrantAQ a fit for where you are right now?
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ padding: "28px 40px 0" }}>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              Hi {userName},
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              You created an account but haven&apos;t logged in in a while. That&apos;s okay — grant seeking isn&apos;t the right priority for every organization at every moment.
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              But I want to ask directly: is there something in GrantAQ that isn&apos;t working for you? A question we could answer? Something that felt confusing or unclear?
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              We built this for organizations like {orgName} — grant consultants turned this into software because they saw how much time and money was being left on the table. If there&apos;s a gap between that and what you&apos;re experiencing, we want to know.
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 24px" }}>
              If you&apos;re ready to give it another look, your matches and pipeline are exactly where you left them:
            </Text>

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
              }}
            >
              Return to My Dashboard
            </Button>

            <Text style={{ color: WARM_500, fontSize: 14, margin: "20px 0 0" }}>
              Or just reply to this email. We read every response.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "28px 40px 32px" }}>
            <Hr style={{ borderColor: WARM_200, margin: "0 0 20px" }} />
            <Text style={{ color: WARM_500, fontSize: 12, margin: 0 }}>
              You&apos;re receiving this because you have an inactive GrantAQ account for {orgName}.
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

export default HonestCheck;
