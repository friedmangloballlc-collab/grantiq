import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Free Grant Application Timeline Planner | GrantAQ",
  description: "Plan your grant application timeline with our free tool. Know exactly when to start, what to prepare, and key deadlines.",
  alternates: { canonical: "https://grantaq.com/tools/grant-timeline" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
