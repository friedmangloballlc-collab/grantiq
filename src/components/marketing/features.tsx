import { Search, BarChart3, FileText, Shield, Brain, Calendar, Folder, Users } from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    title: "AI Grant Matching",
    description: "Instantly match your organization to thousands of grants based on your mission, industry, location, and eligibility.",
  },
  {
    icon: BarChart3,
    title: "Readiness Scorecard",
    description: "Get a data-driven A-Z readiness score that shows exactly where you stand and what to improve before applying.",
  },
  {
    icon: FileText,
    title: "AI Writing Engine",
    description: "Generate full grant drafts, letters of intent, and budget narratives tailored to each funder's priorities — then our expert writers take it across the finish line.",
  },
  {
    icon: Users,
    title: "Expert Review",
    description: "Every AI-generated application is reviewed by an experienced grant writer who refines the narrative, checks funder alignment, and ensures quality before submission.",
  },
  {
    icon: Shield,
    title: "Compliance Checker",
    description: "Automatic compliance scanning catches missing requirements, formatting issues, and eligibility gaps before you submit.",
  },
  {
    icon: Brain,
    title: "Grantie AI Assistant",
    description: "Chat with your AI grant strategist. Ask questions, get recommendations, and plan your funding roadmap.",
  },
  {
    icon: Calendar,
    title: "Deadline Calendar",
    description: "Never miss a deadline. Track every grant opportunity with work-back timelines and fiscal cycle planning.",
  },
  {
    icon: Folder,
    title: "Document Vault",
    description: "Store and reuse boilerplate documents — mission statements, budgets, board lists — across all your applications.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Invite team members, assign grants, and track progress together with role-based access controls.",
  },
];

export function Features() {
  return (
    <section className="py-20 px-4 bg-white dark:bg-warm-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-brand-teal/10 text-brand-teal mb-4">
            Platform Features
          </span>
          <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50">
            Everything You Need to Win Grants
          </h2>
          <p className="text-warm-500 mt-3 max-w-2xl mx-auto">
            From discovery to submission, GrantAQ handles the entire grant lifecycle so you can focus on your mission.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-warm-200 dark:border-warm-700 p-6 hover:border-brand-teal/40 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-teal/10 flex items-center justify-center mb-4">
                <feature.icon className="h-5 w-5 text-brand-teal" />
              </div>
              <h3 className="text-sm font-semibold text-warm-900 dark:text-warm-50 mb-1.5">
                {feature.title}
              </h3>
              <p className="text-xs text-warm-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
