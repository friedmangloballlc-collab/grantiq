import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Free Funding Gap Calculator | GrantAQ",
  description: "Calculate your organization's funding gap and discover how much grant funding you could be missing. Free tool, instant results.",
  alternates: { canonical: "https://grantaq.com/tools/funding-gap" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
