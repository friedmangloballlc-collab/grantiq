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

export interface FinalOfferProps {
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

export function FinalOffer({
  userName,
  orgName,
  appBaseUrl = "https://app.grantaq.com",
  unsubscribeUrl,
}: FinalOfferProps) {
  const resolvedUnsubscribeUrl = unsubscribeUrl ?? `${appBaseUrl}/settings#notifications`;
  const dashboardUrl = `${appBaseUrl}/dashboard`;

  return (
    <Html lang="en">
      <Head />
      <Preview>Before you go — one thing that takes 5 minutes and might change your mind.</Preview>

      <Body style={{ backgroundColor: WARM_50, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>

          {/* Header */}
          <Section style={{ backgroundColor: TEAL, padding: "28px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
              GrantAQ
            </Text>
            <Heading style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, margin: 0, lineHeight: "1.3" }}>
              Before you go — one last thing
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ padding: "28px 40px 0" }}>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              Hi {userName},
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              This is the last email we&apos;ll send you unless you come back. We&apos;re not going to keep filling your inbox.
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              But before you go: your grant matches are still active. Your profile is still being matched against new opportunities. And there may be a grant in your queue right now worth looking at.
            </Text>

            {/* One ask */}
            <div
              style={{
                border: `1px solid ${WARM_200}`,
                borderLeft: `4px solid ${TEAL}`,
                borderRadius: 8,
                padding: "16px 20px",
                margin: "0 0 24px",
              }}
            >
              <Text style={{ color: WARM_900, fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>
                One ask, if you have 5 minutes
              </Text>
              <Text style={{ color: WARM_700, fontSize: 14, margin: 0 }}>
                Log in and check your matches. If nothing looks relevant, we&apos;d genuinely like to know why — it helps us make the matching better for organizations like {orgName}.
              </Text>
            </div>

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
              Take One Last Look
            </Button>

            <Text style={{ color: WARM_500, fontSize: 14, margin: "20px 0 0" }}>
              Your account stays active either way. We just won&apos;t keep reaching out.
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

export default FinalOffer;
