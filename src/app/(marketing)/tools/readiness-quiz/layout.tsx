import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grant Readiness Quiz — GrantAQ",
  description:
    "Answer 10 questions to find out if your organization is ready to apply for grants. Get a readiness score and a personalized action plan — free, no account required.",
};

export default function ReadinessQuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
