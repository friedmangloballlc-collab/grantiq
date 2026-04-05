import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grant Eligibility Checker — GrantAQ",
  description:
    "Select your organization type and instantly see which grant categories you qualify for — federal, foundation, SBIR, CDBG, state, and corporate grants. Free, no account required.",
};

export default function EligibilityCheckerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
