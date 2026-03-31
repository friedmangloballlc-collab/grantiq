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

export interface FullConfidenceProps {
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

export function FullConfidence({
  userName,
  orgName,
  appBaseUrl = "https://app.grantiq.com",
  unsubscribeUrl,
}: FullConfidenceProps) {
  const resolvedUnsubscribeUrl = unsubscribeUrl ?? `${appBaseUrl}/settings#notifications`;
  const pricingUrl = `${appBaseUrl}/pricing#full-confidence`;

  return (
    <Html lang="en">
      <Head />
      <Preview>$0 upfront, 10% of the award if you win. One option worth knowing about.</Preview>

      <Body style={{ backgroundColor: WARM_50, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>

          {/* Header */}
          <Section style={{ backgroundColor: TEAL, padding: "28px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
              GrantIQ
            </Text>
            <Heading style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, margin: 0, lineHeight: "1.3" }}>
              One option worth knowing about
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ padding: "28px 40px 0" }}>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              Hi {userName},
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              We offer something unusual: a done-for-you grant writing option where you pay nothing upfront. If your application is funded, we take 10% of the award.
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              We call it <strong>Full Confidence</strong>.
            </Text>

            {/* How it works */}
            <div
              style={{
                backgroundColor: "#F0FDFA",
                border: `1px solid #99F6E4`,
                borderLeft: `4px solid ${TEAL}`,
                borderRadius: 8,
                padding: "20px 24px",
                margin: "0 0 20px",
              }}
            >
              <Heading as="h2" style={{ color: TEAL, fontSize: 13, fontWeight: 700, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                How Full Confidence Works
              </Heading>

              {[
                ["You select a grant from your matches", "We confirm it's a strong fit for your profile"],
                ["We write the full application", "AI drafting + expert review from Friedman Global consultants"],
                ["You review and submit", "You keep full control of the submission"],
                ["If funded, we invoice 10%", "If not funded, you owe nothing"],
              ].map(([step, detail], i) => (
                <div key={i} style={{ marginBottom: i < 3 ? 12 : 0 }}>
                  <Text style={{ color: WARM_900, fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>
                    {i + 1}. {step}
                  </Text>
                  <Text style={{ color: WARM_700, fontSize: 13, margin: 0 }}>
                    {detail}
                  </Text>
                </div>
              ))}
            </div>

            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 16px" }}>
              This isn&apos;t for every grant or every organization. It makes sense when: the grant is significant (typically $50K+), your profile is a genuine fit, and the writing quality will materially affect the outcome.
            </Text>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 24px" }}>
              No obligation to use it. But worth knowing it exists.
            </Text>

            <Button
              href={pricingUrl}
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
              Learn About Full Confidence
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

export default FullConfidence;
