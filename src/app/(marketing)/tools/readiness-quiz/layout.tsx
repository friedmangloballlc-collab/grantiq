import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Free Grant Readiness Quiz | GrantAQ",
  description: "Take our free grant readiness quiz to see how prepared your organization is for grant funding. Instant results, no account needed.",
  alternates: { canonical: "https://grantaq.com/tools/readiness-quiz" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
