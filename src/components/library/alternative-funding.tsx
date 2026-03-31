"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Gift, Users } from "lucide-react";

interface FundingProgram {
  name: string;
  provider: string;
  description: string;
  amount: string;
  badge: string;
  badgeClass: string;
  url?: string;
}

const LOANS: FundingProgram[] = [
  {
    name: "SBA 7(a) Loan Program",
    provider: "U.S. Small Business Administration",
    description: "The SBA's primary program for providing financial assistance to small businesses. Loans up to $5M for working capital, equipment, real estate, and more.",
    amount: "Up to $5M",
    badge: "LOAN",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
    url: "https://www.sba.gov/funding-programs/loans/7a-loans",
  },
  {
    name: "SBA Microloan Program",
    provider: "U.S. Small Business Administration",
    description: "Provides small, short-term loans to small businesses and certain not-for-profit childcare centers. Average microloan is about $13,000.",
    amount: "Up to $50K",
    badge: "LOAN",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
    url: "https://www.sba.gov/funding-programs/loans/microloans",
  },
  {
    name: "CDFI Fund Loans",
    provider: "Community Development Financial Institutions Fund",
    description: "CDFIs provide loans, investments, financial services, and technical assistance to underserved communities and populations.",
    amount: "Varies",
    badge: "LOAN",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
    url: "https://www.cdfifund.gov",
  },
  {
    name: "SBA 504 Loan Program",
    provider: "U.S. Small Business Administration",
    description: "Long-term, fixed-rate financing for major fixed assets that promote business growth and job creation, such as equipment and real estate.",
    amount: "Up to $5.5M",
    badge: "LOAN",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
    url: "https://www.sba.gov/funding-programs/loans/504-loans",
  },
];

const IN_KIND: FundingProgram[] = [
  {
    name: "Google Ad Grants",
    provider: "Google",
    description: "Eligible nonprofits receive $10,000/month in free Google Ads advertising to promote their mission and programs online.",
    amount: "$10K/month",
    badge: "IN-KIND",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
    url: "https://www.google.com/grants/",
  },
  {
    name: "Salesforce.org Nonprofit Cloud",
    provider: "Salesforce",
    description: "10 free licenses of Salesforce CRM for eligible nonprofits, plus discounted rates on additional products.",
    amount: "10 Free Licenses",
    badge: "IN-KIND",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
    url: "https://www.salesforce.org/nonprofit/",
  },
  {
    name: "TechSoup Product Donations",
    provider: "TechSoup",
    description: "Technology products and services donated or discounted for nonprofits, including software, hardware, cloud services, and training.",
    amount: "Varies",
    badge: "IN-KIND",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
    url: "https://www.techsoup.org",
  },
  {
    name: "Microsoft for Nonprofits",
    provider: "Microsoft",
    description: "Donated and discounted Microsoft products including Office 365, Azure, and Dynamics 365 for eligible nonprofit organizations.",
    amount: "Up to $3,500/year",
    badge: "IN-KIND",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
    url: "https://nonprofit.microsoft.com",
  },
  {
    name: "AWS Nonprofits",
    provider: "Amazon Web Services",
    description: "AWS credits and support for eligible nonprofits to help them build and scale their technology infrastructure.",
    amount: "Up to $2,000 credits",
    badge: "IN-KIND",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
    url: "https://aws.amazon.com/government-education/nonprofits/",
  },
];

const MATCHING: FundingProgram[] = [
  {
    name: "Double the Donation",
    provider: "Double the Donation Platform",
    description: "Database of 26M+ employees eligible for employer matching gift programs. Helps nonprofits identify and claim matching gifts.",
    amount: "Varies by employer",
    badge: "MATCHING",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    url: "https://doublethedonation.com",
  },
  {
    name: "Benevity Giving Program",
    provider: "Benevity",
    description: "Corporate social responsibility platform connecting companies and their employees to causes. Manages matching gift programs for 1,000+ employers.",
    amount: "1:1 to 3:1 match",
    badge: "MATCHING",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    url: "https://benevity.com",
  },
  {
    name: "YourCause Corporate Grants",
    provider: "YourCause / Blackbaud",
    description: "Enterprise corporate giving software that enables employee giving and volunteer programs, including matching gift administration.",
    amount: "Varies",
    badge: "MATCHING",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    url: "https://yourcause.com",
  },
  {
    name: "Giving with Wells Fargo",
    provider: "Wells Fargo",
    description: "Wells Fargo matches eligible employee donations to nonprofits at a 1:1 ratio, up to $5,000 per employee per year.",
    amount: "Up to $5K/employee",
    badge: "MATCHING",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    url: "https://www.wellsfargo.com/about/corporate-responsibility/community-giving/",
  },
];

function FundingCard({ program }: { program: FundingProgram }) {
  return (
    <Card className="border-warm-200 dark:border-warm-800 hover:border-brand-teal/50 transition-colors h-full">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium shrink-0 ${program.badgeClass}`}>
            {program.badge}
          </span>
          <span className="text-sm font-semibold text-warm-700 dark:text-warm-300 text-right">
            {program.amount}
          </span>
        </div>
        <h3 className="font-semibold text-warm-900 dark:text-warm-50 leading-snug">
          {program.name}
        </h3>
        <p className="text-sm text-warm-500 mt-0.5">{program.provider}</p>
        <p className="text-sm text-warm-600 dark:text-warm-400 mt-2 flex-1 line-clamp-3">
          {program.description}
        </p>
        {program.url && (
          <a
            href={program.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center text-xs text-brand-teal hover:underline"
          >
            Learn more →
          </a>
        )}
      </CardContent>
    </Card>
  );
}

interface SectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  programs: FundingProgram[];
}

function FundingSection({ title, description, icon, programs }: SectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-warm-400">{icon}</div>
        <div>
          <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-50">{title}</h2>
          <p className="text-sm text-warm-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {programs.map((p) => (
          <FundingCard key={p.name} program={p} />
        ))}
      </div>
      <p className="text-xs text-warm-400 dark:text-warm-500 italic">
        This is a curated reference list. Full database integration coming soon.
      </p>
    </div>
  );
}

export function AlternativeFunding({ section }: { section: "loans" | "inkind" | "matching" }) {
  if (section === "loans") {
    return (
      <FundingSection
        title="Loans"
        description="Low-interest and no-collateral loan programs from government and community lenders."
        icon={<DollarSign className="h-5 w-5" />}
        programs={LOANS}
      />
    );
  }
  if (section === "inkind") {
    return (
      <FundingSection
        title="In-Kind Resources"
        description="Free or deeply discounted products, services, and technology from corporate donors."
        icon={<Gift className="h-5 w-5" />}
        programs={IN_KIND}
      />
    );
  }
  return (
    <FundingSection
      title="Matching Gifts"
      description="Employee matching gift programs that double or triple individual donations to your organization."
      icon={<Users className="h-5 w-5" />}
      programs={MATCHING}
    />
  );
}
