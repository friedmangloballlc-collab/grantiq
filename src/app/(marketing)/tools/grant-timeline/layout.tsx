import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grant Application Timeline — GrantAQ",
  description:
    "See how long a grant application takes from start to decision. Plan backwards from your deadline with a step-by-step timeline based on grant size, source, and your experience level.",
};

export default function GrantTimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
