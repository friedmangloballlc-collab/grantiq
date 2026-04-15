import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Link,
  Hr,
} from "@react-email/components";

const TEAL = "#0D9488";
const WARM_900 = "#1C1917";
const WARM_500 = "#78716C";
const WARM_200 = "#E7E5E4";
const WARM_50 = "#FAFAF9";

export interface EmailLayoutProps {
  preview: string;
  headerTitle?: string;
  headerSubtitle?: string;
  children: React.ReactNode;
  footerText?: string;
}

export function EmailLayout({ preview, headerTitle = "GrantAQ", headerSubtitle, children, footerText }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: WARM_50, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <Section style={{ backgroundColor: TEAL, padding: "24px 40px" }}>
            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, margin: "0 0 4px" }}>
              {headerTitle}
            </Text>
            {headerSubtitle && (
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, fontWeight: 600, margin: 0 }}>
                {headerSubtitle}
              </Text>
            )}
          </Section>
          <Section style={{ padding: "32px 40px" }}>
            {children}
          </Section>
          <Hr style={{ borderColor: WARM_200, margin: "0 40px" }} />
          <Section style={{ backgroundColor: WARM_50, padding: "16px 40px", borderTop: `1px solid ${WARM_200}` }}>
            <Text style={{ fontSize: 11, color: WARM_500, margin: 0, textAlign: "center" as const }}>
              {footerText ?? "GrantAQ · AI-Powered Grant Discovery & Strategy"}
            </Text>
            <Text style={{ fontSize: 11, color: WARM_500, margin: "4px 0 0", textAlign: "center" as const }}>
              <Link href="https://grantaq.com" style={{ color: WARM_500 }}>grantaq.com</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Shared text styles
export const bodyText = { fontSize: 14, color: WARM_900, margin: "0 0 14px", lineHeight: "1.6" };
export const mutedText = { fontSize: 13, color: WARM_500, margin: "0 0 12px", lineHeight: "1.5" };
export const boldText = { ...bodyText, fontWeight: 700 };
export const bulletText = { fontSize: 13, color: WARM_900, margin: "0 0 6px", lineHeight: "1.5" };
export const ctaStyle = { backgroundColor: TEAL, color: "#ffffff", fontSize: 14, fontWeight: 600, padding: "12px 28px", borderRadius: 8, textDecoration: "none" };
export const signoffText = { fontSize: 14, color: WARM_900, margin: "20px 0 0" };
