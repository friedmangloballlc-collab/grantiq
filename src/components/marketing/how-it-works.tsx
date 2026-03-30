import { UserPlus, Search, FileText } from "lucide-react";

const STEPS = [
  {
    icon: UserPlus,
    title: "Tell us about your org",
    desc: "Answer a few questions. Our AI builds your profile in under 3 minutes.",
  },
  {
    icon: Search,
    title: "Get matched to grants",
    desc: "AI scans 5,000+ sources and ranks them by fit. See why each one matches.",
  },
  {
    icon: FileText,
    title: "Apply with confidence",
    desc: "AI builds your strategy, writes your application, and checks compliance.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 bg-warm-50 dark:bg-warm-800/30 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-warm-900 dark:text-warm-50">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 mt-12">
          {STEPS.map((step, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-teal/10 flex items-center justify-center mx-auto">
                <step.icon className="h-8 w-8 text-brand-teal" />
              </div>
              <h3 className="text-lg font-semibold mt-4 text-warm-900 dark:text-warm-50">{step.title}</h3>
              <p className="text-sm text-warm-500 mt-2">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
