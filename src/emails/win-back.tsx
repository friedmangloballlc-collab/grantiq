import { Text, Button, Section } from "@react-email/components";
import { EmailLayout, bodyText, bulletText, ctaStyle, signoffText } from "./shared-layout";

export interface WinBackProps {
  firstName: string;
  matchCount: number;
  pipelineCount: number;
  docsCount: number;
  daysSinceCancel: number;
  appBaseUrl?: string;
}

export function WinBack({ firstName, matchCount, pipelineCount, docsCount, daysSinceCancel, appBaseUrl = "https://grantaq.com" }: WinBackProps) {
  const isDay1 = daysSinceCancel <= 1;
  const isDay7 = daysSinceCancel <= 7;
  const isDay14 = daysSinceCancel <= 14;

  return (
    <EmailLayout
      preview={isDay1 ? `We noticed you cancelled, ${firstName}` : `Your GrantAQ data is still here, ${firstName}`}
      headerSubtitle={isDay1 ? "We Miss You" : "Your Data is Waiting"}
    >
      <Text style={bodyText}>Hi {firstName},</Text>

      {isDay1 && (
        <>
          <Text style={bodyText}>We noticed you cancelled your subscription. We get it — timing matters.</Text>
          <Text style={bodyText}>Your data is completely safe and waiting for you:</Text>
        </>
      )}

      {!isDay1 && isDay7 && (
        <>
          <Text style={bodyText}>It&apos;s been a week since you cancelled. Quick reminder of what you built:</Text>
        </>
      )}

      {!isDay7 && isDay14 && (
        <>
          <Text style={bodyText}>Your GrantAQ account still has everything you built. Here&apos;s what&apos;s waiting:</Text>
        </>
      )}

      {!isDay14 && (
        <>
          <Text style={bodyText}>It&apos;s been a month. Your data is still saved — but grant cycles move on without you.</Text>
        </>
      )}

      <Section style={{ backgroundColor: "#F5F5F4", borderRadius: 8, padding: "16px 20px", margin: "0 0 16px" }}>
        <Text style={bulletText}>{matchCount} grant matches found for your organization</Text>
        <Text style={bulletText}>{pipelineCount} grants in your pipeline</Text>
        <Text style={bulletText}>{docsCount} documents in your vault</Text>
      </Section>

      {isDay14 && (
        <Text style={bodyText}>
          <strong>Special offer:</strong> Come back today and get 2 months free on any annual plan. That&apos;s up to $998 in savings.
        </Text>
      )}

      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href={`${appBaseUrl}/upgrade`} style={ctaStyle}>
          {isDay14 ? "Reactivate — 2 Months Free" : "Reactivate Your Account"}
        </Button>
      </Section>

      <Text style={{ ...bodyText, fontSize: 12, color: "#78716C" }}>
        All your data is preserved. You can pick up right where you left off.
      </Text>

      <Text style={signoffText}>The GrantAQ Team</Text>
    </EmailLayout>
  );
}
