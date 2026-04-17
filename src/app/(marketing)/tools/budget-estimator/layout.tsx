import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Free Grant Budget Estimator | GrantAQ",
  description: "Estimate your grant project budget with our free tool. Build budgets that match funder requirements.",
  alternates: { canonical: "https://grantaq.com/tools/budget-estimator" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
