import { Check, PenLine, Users, Send } from "lucide-react";

const STEPS = [
  {
    icon: Check,
    step: "01",
    title: "AI Discovery",
    description:
      "Our AI scans 4,000+ grants and matches you to opportunities you qualify for — ranked by fit, deadline, and award size.",
  },
  {
    icon: PenLine,
    step: "02",
    title: "AI Drafting",
    description:
      "AI generates a complete first draft tailored to each funder's priorities, funding history, and application requirements.",
  },
  {
    icon: Users,
    step: "03",
    title: "Expert Review",
    description:
      "An experienced grant writer reviews, refines, and strengthens your application — checking funder alignment, narrative quality, and compliance.",
  },
  {
    icon: Send,
    step: "04",
    title: "Submit & Track",
    description:
      "Submit through GrantAQ. We track your outcome, log your history, and improve future matches based on your results.",
  },
];

export function HowWeWork() {
  return (
    <section className="py-20 px-4 bg-warm-50 dark:bg-warm-800/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-brand-teal/10 text-brand-teal mb-4">
            Our Process
          </span>
          <h2 className="text-3xl font-bold text-warm-900 dark:text-warm-50">
            How We Work
          </h2>
          <p className="text-warm-500 mt-3 max-w-2xl mx-auto">
            GrantAQ combines AI technology with expert grant writers — so every application benefits from both speed and human judgment.
          </p>
        </div>

        {/* Desktop: horizontal timeline */}
        <div className="hidden md:grid md:grid-cols-4 gap-0 relative">
          {/* Connecting line */}
          <div className="absolute top-8 left-[12.5%] right-[12.5%] h-px bg-brand-teal/20" aria-hidden="true" />

          {STEPS.map((step, index) => (
            <div key={step.step} className="flex flex-col items-center text-center px-4 relative">
              {/* Step connector dots between cards */}
              {index < STEPS.length - 1 && (
                <div className="absolute top-[26px] right-0 w-4 h-4 rounded-full bg-brand-teal/20 translate-x-1/2 z-10 hidden md:block" aria-hidden="true" />
              )}

              {/* Icon circle */}
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-warm-900 border-2 border-brand-teal/20 flex items-center justify-center mb-4 z-10 relative shadow-sm">
                <step.icon className="h-7 w-7 text-brand-teal" />
              </div>

              {/* Step label */}
              <span className="text-xs font-semibold text-brand-teal/60 uppercase tracking-widest mb-1">
                Step {step.step}
              </span>

              <h3 className="text-sm font-semibold text-warm-900 dark:text-warm-50 mb-2">
                {step.title}
              </h3>

              <p className="text-xs text-warm-500 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile: vertical stack */}
        <div className="md:hidden space-y-0">
          {STEPS.map((step, index) => (
            <div key={step.step} className="flex gap-4 relative">
              {/* Vertical connecting line */}
              {index < STEPS.length - 1 && (
                <div className="absolute left-6 top-16 bottom-0 w-px bg-brand-teal/20" aria-hidden="true" />
              )}

              {/* Icon */}
              <div className="shrink-0 w-12 h-12 rounded-xl bg-white dark:bg-warm-900 border-2 border-brand-teal/20 flex items-center justify-center z-10 relative shadow-sm">
                <step.icon className="h-5 w-5 text-brand-teal" />
              </div>

              {/* Content */}
              <div className="pb-8">
                <span className="text-xs font-semibold text-brand-teal/60 uppercase tracking-widest">
                  Step {step.step}
                </span>
                <h3 className="text-sm font-semibold text-warm-900 dark:text-warm-50 mt-0.5 mb-1">
                  {step.title}
                </h3>
                <p className="text-xs text-warm-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
