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

export interface DeadlineWarningProps {
  userName: string;
  orgName: string;
  grantName: string;
  funderName: string;
  daysUntilDeadline: number;
  deadlineDate: string;
  grantAmount: string;
  grantId: string;
  appBaseUrl?: string;
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

function deadlineColor(daysLeft: number): string {
  if (daysLeft <= 7) return RED_600;
  if (daysLeft <= 14) return AMBER_600;
  return WARM_700;
}

export function DeadlineWarning({
  userName,
  orgName,
  grantName,
  funderName,
  daysUntilDeadline,
  deadlineDate,
  grantAmount,
  grantId,
  appBaseUrl = "https://app.grantiq.com",
  unsubscribeUrl,
}: DeadlineWarningProps) {
  const resolvedUnsubscribeUrl = unsubscribeUrl ?? `${appBaseUrl}/settings#notifications`;
  const grantUrl = `${appBaseUrl}/grants/${grantId}`;
  const color = deadlineColor(daysUntilDeadline);

  const urgencyText =
    daysUntilDeadline <= 7
      ? `${daysUntilDeadline} day${daysUntilDeadline !== 1 ? "s" : ""} left`
      : daysUntilDeadline <= 14
      ? `${daysUntilDeadline} days — time to move`
      : `${daysUntilDeadline} days`;

  return (
    <Html lang="en">
      <Head />
      <Preview>A matched grant has a deadline coming up — {grantName} closes {deadlineDate}.</Preview>

      <Body style={{ backgroundColor: WARM_50, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>

          {/* Header */}
          <Section style={{ backgroundColor: TEAL, padding: "28px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
              GrantIQ
            </Text>
            <Heading style={{ color: "#ffffff", fontSize: 22, fontWeight: 700, margin: 0, lineHeight: "1.3" }}>
              A deadline you should know about
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ padding: "28px 40px 0" }}>
            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 24px" }}>
              Hi {userName}, one of your grant matches has a deadline approaching. Since you haven&apos;t logged in recently, we wanted to make sure you saw this:
            </Text>

            {/* Deadline card */}
            <div
              style={{
                border: `2px solid ${color}`,
                borderRadius: 8,
                padding: "20px 24px",
                margin: "0 0 24px",
              }}
            >
              <Text style={{ color: WARM_900, fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>
                {grantName}
              </Text>
              <Text style={{ color: WARM_500, fontSize: 14, margin: "0 0 12px" }}>
                {funderName}
              </Text>

              <Text style={{ color: color, fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>
                {urgencyText}
              </Text>
              <Text style={{ color: WARM_700, fontSize: 14, margin: "0 0 12px" }}>
                Deadline: {deadlineDate}
              </Text>

              <Text style={{ color: WARM_700, fontSize: 14, margin: 0 }}>
                Award amount: {grantAmount}
              </Text>
            </div>

            <Text style={{ color: WARM_700, fontSize: 15, margin: "0 0 24px" }}>
              Even if you&apos;re not ready to submit, it&apos;s worth 10 minutes to review this grant and decide whether to pursue it before the window closes.
            </Text>

            <Button
              href={grantUrl}
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
              Review This Grant
            </Button>
          </Section>

          {/* Footer */}
          <Section style={{ padding: "28px 40px 32px" }}>
            <Hr style={{ borderColor: WARM_200, margin: "0 0 20px" }} />
            <Text style={{ color: WARM_500, fontSize: 12, margin: 0 }}>
              You&apos;re receiving this because of grant activity in your GrantIQ account for {orgName}.
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

export default DeadlineWarning;
