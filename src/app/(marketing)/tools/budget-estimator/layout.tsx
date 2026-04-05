import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grant Budget Estimator — GrantAQ",
  description:
    "Estimate how much grant funding your organization could realistically pursue based on your industry, annual budget, and grant writing experience. Free tool, no account required.",
};

export default function BudgetEstimatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
