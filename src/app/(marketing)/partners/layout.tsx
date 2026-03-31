import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner Program — GrantAQ",
  description:
    "Embed the GrantAQ Grant Finder widget on your website and earn $25 per signup. Built for SCORE chapters, SBDCs, nonprofit associations, and accounting firms.",
  openGraph: {
    title: "Partner with GrantAQ — Earn $25 Per Signup",
    description:
      "Help your clients find grants with the GrantAQ embed widget. One line of code, $25 per signup. Apply to become a partner today.",
    url: "https://grantaq.com/partners",
    siteName: "GrantAQ",
    type: "website",
  },
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
