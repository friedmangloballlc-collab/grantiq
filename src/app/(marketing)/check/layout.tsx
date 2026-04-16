import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Grant Eligibility Check — Am I Eligible for Grants? | GrantAQ",
  description:
    "Check your grant eligibility in 60 seconds — free, no account needed. Find out which federal, state, foundation, and corporate grants your organization qualifies for.",
  keywords: [
    "am I eligible for grants",
    "grant eligibility check",
    "small business grant eligibility",
    "nonprofit grant eligibility",
    "grant readiness assessment",
    "free grant check",
    "can my LLC get a grant",
    "grant eligibility quiz",
    "small business grant requirements",
    "501c3 grant eligibility",
  ],
  alternates: {
    canonical: "https://grantaq.com/check",
  },
  openGraph: {
    title: "Free Grant Eligibility Check — Find Out in 60 Seconds",
    description: "AI-powered eligibility assessment. See which grants you qualify for, what's blocking you, and how to fix it. No account needed.",
    url: "https://grantaq.com/check",
    siteName: "GrantAQ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Grant Eligibility Check | GrantAQ",
    description: "Check your grant eligibility in 60 seconds — free. See which grants you qualify for.",
  },
  other: {
    // Schema.org JSON-LD is added below via script tag
  },
};

export default function CheckLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "GrantAQ Grant Eligibility Check",
            description: "Free AI-powered grant eligibility assessment for small businesses and nonprofits.",
            url: "https://grantaq.com/check",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              description: "Free grant eligibility check — no account needed",
            },
            provider: {
              "@type": "Organization",
              name: "GrantAQ",
              url: "https://grantaq.com",
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Am I eligible for grants?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Grant eligibility depends on your entity type, location, industry, and compliance status. Use our free eligibility check to get an instant AI-powered assessment of which grants you qualify for.",
                },
              },
              {
                "@type": "Question",
                name: "Can an LLC get a grant?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes, LLCs can qualify for certain grants including SBA programs, SBIR/STTR, state economic development grants, corporate starter grants, and some foundation grants. Our free check tells you exactly which ones.",
                },
              },
              {
                "@type": "Question",
                name: "How do I know if my nonprofit is grant-ready?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Grant readiness requires active 501(c)(3) status, filed 990s, dedicated bank account, governance policies, and SAM.gov registration for federal grants. Our diagnostic assesses all of these in 30 seconds.",
                },
              },
            ],
          }),
        }}
      />
      {children}
    </>
  );
}
