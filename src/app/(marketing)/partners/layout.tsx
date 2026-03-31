import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner Program — GrantIQ",
  description:
    "Embed the GrantIQ Grant Finder widget on your website and earn $25 per signup. Built for SCORE chapters, SBDCs, nonprofit associations, and accounting firms.",
  openGraph: {
    title: "Partner with GrantIQ — Earn $25 Per Signup",
    description:
      "Help your clients find grants with the GrantIQ embed widget. One line of code, $25 per signup. Apply to become a partner today.",
    url: "https://grantiq-gold.vercel.app/partners",
    siteName: "GrantIQ",
    type: "website",
  },
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
