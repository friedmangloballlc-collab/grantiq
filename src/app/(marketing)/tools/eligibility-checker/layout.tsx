import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Free Grant Eligibility Checker | GrantAQ",
  description: "Check if your organization is eligible for grants. Free tool covers federal, state, foundation, and corporate programs.",
  alternates: { canonical: "https://grantaq.com/tools/eligibility-checker" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
