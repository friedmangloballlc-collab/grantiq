import Link from "next/link";
import { Calculator, CheckCircle, Search, FileText, Building2, Clock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Grant Tools — GrantAQ",
  description:
    "Free tools to help your organization find and win grants. Calculate your funding gap, check your grant readiness, explore grant deadlines, and more.",
};

const TOOLS = [
  {
    icon: Calculator,
    title: "Funding Gap Calculator",
    description:
      "See how much grant funding you're missing based on your org type, budget, and location. Get a personalized estimate in seconds.",
    href: "/tools/funding-gap",
    badge: "Popular",
  },
  {
    icon: CheckCircle,
    title: "Grant Readiness Quiz",
    description:
      "Answer 10 quick questions to find out if your organization is ready to apply for grants. Get a readiness score and action plan.",
    href: "/tools/readiness-quiz",
    badge: "New",
  },
  {
    icon: Search,
    title: "Grant Finder by State",
    description:
      "Browse grants available in your state. See federal, state, and foundation funding opportunities filtered by location.",
    href: "/grants/states",
    badge: null,
  },
  {
    icon: FileText,
    title: "Grant Directory",
    description:
      "Explore our database of 5,000+ active grants. Filter by industry, entity type, funding amount, and deadline.",
    href: "/grant-directory",
    badge: null,
  },
  {
    icon: Building2,
    title: "Nonprofit Startup Guide",
    description:
      "Learn what it takes to start a nonprofit. Understand entity types, 501(c)(3) requirements, and how to get grant-ready from day one.",
    href: "/signup/nonprofit",
    badge: null,
  },
  {
    icon: Clock,
    title: "Grant Deadline Tracker",
    description:
      "See upcoming grant deadlines across all categories. Never miss a submission window — sign up free to add them to your calendar.",
    href: "/signup",
    badge: "Sign up free",
  },
];

export default function FreeToolsPage() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-brand-teal/10 text-brand-teal mb-4">
            100% Free
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-warm-900 dark:text-warm-50">
            Free Grant Tools
          </h1>
          <p className="text-warm-500 mt-3 max-w-xl mx-auto">
            No account required. Use these tools to assess your grant readiness, find
            opportunities, and estimate your funding potential.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOOLS.map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className="group rounded-xl border border-warm-200 dark:border-warm-700 p-6 hover:border-brand-teal/40 hover:shadow-md transition-all relative"
            >
              {tool.badge && (
                <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal">
                  {tool.badge}
                </span>
              )}
              <div className="w-10 h-10 rounded-lg bg-brand-teal/10 flex items-center justify-center mb-4 group-hover:bg-brand-teal/20 transition-colors">
                <tool.icon className="h-5 w-5 text-brand-teal" />
              </div>
              <h2 className="text-base font-semibold text-warm-900 dark:text-warm-50 mb-2">
                {tool.title}
              </h2>
              <p className="text-sm text-warm-500 leading-relaxed">
                {tool.description}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-warm-500 text-sm mb-4">
            Want the full experience? AI matching, pipeline tracking, and writing tools included.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-teal hover:bg-brand-teal-dark text-white font-medium text-sm transition-colors"
          >
            Start Free — No Credit Card Required
          </Link>
        </div>
      </div>
    </div>
  );
}
