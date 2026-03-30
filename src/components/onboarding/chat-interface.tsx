"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Square, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProfileData } from "./profile-card";

// ─── Step Definitions ────────────────────────────────────────────────────────

type StepType = "single_select" | "multi_select" | "text" | "textarea";

interface StepOption {
  label: string;
  value: string;
}

interface Step {
  id: string;
  question: string;
  subtitle?: string;
  type: StepType;
  options?: StepOption[];
  placeholder?: string;
  showIf?: (answers: Record<string, string | string[]>) => boolean;
}

const ONBOARDING_STEPS: Step[] = [
  {
    id: "entity_type",
    question: "What type of organization are you?",
    type: "single_select",
    options: [
      { label: "501(c)(3) Nonprofit", value: "nonprofit_501c3" },
      { label: "Other Nonprofit", value: "nonprofit_other" },
      { label: "LLC", value: "llc" },
      { label: "S-Corporation", value: "corporation" },
      { label: "C-Corporation", value: "corporation" },
      { label: "Sole Proprietorship", value: "sole_prop" },
      { label: "Partnership", value: "partnership" },
      { label: "Startup / Pre-Revenue", value: "other" },
      { label: "Municipality / Government", value: "other" },
    ],
  },
  {
    id: "industry",
    question: "What industry are you in?",
    type: "single_select",
    options: [
      { label: "Technology & Software", value: "technology" },
      { label: "Healthcare & Wellness", value: "healthcare" },
      { label: "Education & Training", value: "education" },
      { label: "Retail & E-commerce", value: "retail" },
      { label: "Food & Beverage", value: "food_beverage" },
      { label: "Professional Services", value: "professional_services" },
      { label: "Manufacturing", value: "manufacturing" },
      { label: "Construction & Trades", value: "construction" },
      { label: "Creative & Arts", value: "creative_arts" },
      { label: "Non-Profit / Social Enterprise", value: "nonprofit_social" },
      { label: "Agriculture & Farming", value: "agriculture" },
      { label: "Energy & Environment", value: "energy" },
      { label: "Other", value: "other" },
    ],
  },
  {
    id: "funding_use",
    question: "What would you use grant funding for?",
    type: "single_select",
    options: [
      { label: "Start or launch a business", value: "launch" },
      { label: "Hire employees / expand team", value: "hiring" },
      { label: "Purchase equipment or inventory", value: "equipment" },
      { label: "R&D / Innovation", value: "research" },
      { label: "Marketing & business development", value: "marketing" },
      { label: "Technology upgrades", value: "technology" },
      { label: "Training & workforce development", value: "training" },
      { label: "Facility expansion", value: "facility" },
      { label: "Working capital", value: "working_capital" },
    ],
  },
  {
    id: "business_stage",
    question: "What stage is your business in?",
    type: "single_select",
    options: [
      { label: "Planning stage (not yet launched)", value: "planning" },
      { label: "Startup (less than 1 year)", value: "startup" },
      { label: "Early stage (1-3 years)", value: "early" },
      { label: "Established (3+ years)", value: "established" },
    ],
  },
  {
    id: "grant_history",
    question: "Have you received grants or incentives before?",
    type: "single_select",
    options: [
      { label: "Yes, I have received grants", value: "experienced" },
      { label: "No, this would be my first time", value: "none" },
    ],
  },
  {
    id: "location",
    question: "Where is your business located?",
    subtitle: "Enter your city and state",
    type: "text",
    placeholder: "e.g. Miami, FL",
  },
  {
    id: "employee_count",
    question: "How many employees do you have?",
    type: "single_select",
    options: [
      { label: "Just me (solo)", value: "1" },
      { label: "2-10 employees", value: "5" },
      { label: "11-50 employees", value: "30" },
      { label: "51-200 employees", value: "100" },
      { label: "201-500 employees", value: "350" },
      { label: "500+ employees", value: "500" },
    ],
  },
  {
    id: "annual_revenue",
    question: "What's your annual revenue?",
    type: "single_select",
    options: [
      { label: "Pre-revenue", value: "0" },
      { label: "Under $50,000", value: "25000" },
      { label: "$50,000 - $250,000", value: "150000" },
      { label: "$250,000 - $1M", value: "500000" },
      { label: "$1M - $5M", value: "3000000" },
      { label: "$5M+", value: "5000000" },
    ],
  },
  {
    id: "ownership",
    question: "Do any of these apply to your business ownership?",
    subtitle: "Select all that apply, or skip",
    type: "multi_select",
    options: [
      { label: "Woman-owned", value: "woman_owned" },
      { label: "Minority-owned", value: "minority_owned" },
      { label: "Veteran-owned", value: "veteran_owned" },
      { label: "Disability-owned", value: "disability_owned" },
      { label: "LGBTQ+-owned", value: "lgbtq_owned" },
      { label: "None of these", value: "none" },
    ],
  },
  {
    id: "mission",
    question: "Tell us about your organization",
    subtitle: "What do you do and who do you serve?",
    type: "textarea",
    placeholder:
      "e.g. We provide affordable legal services to low-income families in South Florida...",
  },
  {
    id: "documents",
    question: "Which documents do you have ready?",
    subtitle: "Select all that apply",
    type: "multi_select",
    options: [
      { label: "Business plan", value: "business_plan" },
      { label: "Budget & financial statements", value: "financials" },
      { label: "EIN (Employer ID Number)", value: "ein" },
      { label: "501(c)(3) letter (nonprofits)", value: "501c3_letter" },
      { label: "SAM.gov registration", value: "sam_gov" },
      { label: "Tax returns", value: "tax_returns" },
      { label: "I don't have any yet", value: "none" },
    ],
  },
  {
    id: "interested_nonprofit",
    question: "Are you interested in starting a nonprofit?",
    subtitle: "We can connect you with resources for nonprofit formation",
    type: "single_select",
    options: [
      { label: "Yes, I'm interested", value: "yes" },
      { label: "No thanks", value: "no" },
    ],
    showIf: (answers) => {
      const et = answers.entity_type;
      return typeof et === "string" && !et.startsWith("nonprofit");
    },
  },
];

const ENCOURAGEMENTS = [
  "Great choice!",
  "Perfect, got it!",
  "Awesome!",
  "Nice!",
  "That helps a lot!",
  "Excellent!",
  "Good to know!",
  "Thanks!",
  "Almost there!",
  "Great, just a few more!",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getVisibleSteps(answers: Record<string, string | string[]>): Step[] {
  return ONBOARDING_STEPS.filter(
    (step) => !step.showIf || step.showIf(answers)
  );
}

function answerToProfileUpdate(
  stepId: string,
  value: string | string[]
): Partial<ProfileData> {
  switch (stepId) {
    case "entity_type":
      return { entity_type: value as string };
    case "industry":
      return { industry: value as string };
    case "funding_use":
      return { funding_use: value as string };
    case "business_stage":
      return { business_stage: value as string };
    case "grant_history":
      return { grant_history: value as string };
    case "location":
      return { location: value as string };
    case "employee_count":
      return { employee_count: value as string };
    case "annual_revenue":
      return { annual_revenue: value as string };
    case "ownership":
      return { ownership: (value as string[]).join(", ") };
    case "mission":
      return { mission: value as string };
    case "documents":
      return { documents: (value as string[]).join(", ") };
    case "interested_nonprofit":
      return { interested_nonprofit: value as string };
    default:
      return {};
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ChatInterfaceProps {
  onProfileUpdate: (data: Partial<ProfileData>, completedCount: number) => void;
}

export function ChatInterface({ onProfileUpdate }: ChatInterfaceProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [textInput, setTextInput] = useState("");
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [encIndex, setEncIndex] = useState(0);

  const visibleSteps = getVisibleSteps(answers);
  const currentStep = visibleSteps[currentStepIndex];
  const totalSteps = visibleSteps.length;

  // Reset multi/text input when step changes
  useEffect(() => {
    setTextInput("");
    setMultiSelected([]);
  }, [currentStepIndex]);

  const saveToServer = async (stepId: string, value: string | string[]) => {
    try {
      await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: stepId, value }),
      });
    } catch {
      // non-blocking — profile card still updates locally
    }
  };

  const advance = async (value: string | string[]) => {
    if (saving) return;
    setSaving(true);

    const newAnswers = { ...answers, [currentStep.id]: value };
    setAnswers(newAnswers);

    // Update profile card
    const profileUpdate = answerToProfileUpdate(currentStep.id, value);
    const completedCount = Object.keys(newAnswers).length;
    onProfileUpdate(profileUpdate, completedCount);

    // Save to server (fire-and-forget)
    void saveToServer(currentStep.id, value);

    // Show encouragement
    const enc = ENCOURAGEMENTS[encIndex % ENCOURAGEMENTS.length];
    setEncouragement(enc);
    setEncIndex((i) => i + 1);

    // Advance after short delay
    setTimeout(() => {
      setEncouragement(null);
      const nextSteps = getVisibleSteps(newAnswers);
      const nextIndex = currentStepIndex + 1;
      if (nextIndex >= nextSteps.length) {
        setDone(true);
      } else {
        setCurrentStepIndex(nextIndex);
      }
      setSaving(false);
    }, 700);
  };

  const handleSingleSelect = (value: string) => {
    void advance(value);
  };

  const toggleMulti = (value: string) => {
    setMultiSelected((prev) => {
      if (value === "none") return ["none"];
      const withoutNone = prev.filter((v) => v !== "none");
      if (withoutNone.includes(value)) {
        return withoutNone.filter((v) => v !== value);
      }
      return [...withoutNone, value];
    });
  };

  const handleMultiContinue = () => {
    const val = multiSelected.length > 0 ? multiSelected : ["none"];
    void advance(val);
  };

  const handleTextContinue = () => {
    if (!textInput.trim()) return;
    void advance(textInput.trim());
  };

  // ── Done screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center py-12">
        <div className="text-5xl">🎉</div>
        <h3 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          You&apos;re all set!
        </h3>
        <p className="text-warm-500 max-w-sm">
          Your profile is complete. Head to your dashboard to see your grant
          matches!
        </p>
        <Button
          className="bg-brand-teal hover:bg-brand-teal-dark text-white px-8 py-3 text-base"
          onClick={() => {
            window.location.href = "/dashboard";
          }}
        >
          Go to Dashboard
        </Button>
      </div>
    );
  }

  if (!currentStep) return null;

  const progress = Math.round((currentStepIndex / totalSteps) * 100);

  return (
    <div className="flex flex-col flex-1 gap-6">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-warm-400">
          <span>
            Step {currentStepIndex + 1} of {totalSteps}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-warm-200 dark:bg-warm-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-teal rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Grantie avatar + encouragement or question */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-teal flex items-center justify-center text-white text-sm font-bold shrink-0">
          G
        </div>
        <div className="bg-warm-100 dark:bg-warm-800 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-warm-900 dark:text-warm-50 max-w-sm">
          {encouragement ? (
            <span className="font-medium text-brand-teal">{encouragement}</span>
          ) : (
            <>
              <p className="font-medium">{currentStep.question}</p>
              {currentStep.subtitle && (
                <p className="text-warm-400 text-xs mt-0.5">
                  {currentStep.subtitle}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Input area — hidden during encouragement flash */}
      {!encouragement && (
        <div className="flex-1">
          {/* Single select */}
          {currentStep.type === "single_select" && currentStep.options && (
            <div className="grid grid-cols-2 gap-2">
              {currentStep.options.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleSingleSelect(opt.value)}
                  disabled={saving}
                  className={cn(
                    "rounded-xl border-2 px-4 py-3 text-sm text-left font-medium transition-all duration-150",
                    "border-warm-200 dark:border-warm-700 text-warm-800 dark:text-warm-200",
                    "hover:border-brand-teal hover:text-brand-teal",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Multi select */}
          {currentStep.type === "multi_select" && currentStep.options && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {currentStep.options.map((opt) => {
                  const checked = multiSelected.includes(opt.value);
                  return (
                    <button
                      key={opt.label}
                      onClick={() => toggleMulti(opt.value)}
                      disabled={saving}
                      className={cn(
                        "rounded-xl border-2 px-4 py-3 text-sm text-left font-medium transition-all duration-150 flex items-center gap-2",
                        checked
                          ? "border-brand-teal bg-brand-teal/10 text-brand-teal"
                          : "border-warm-200 dark:border-warm-700 text-warm-800 dark:text-warm-200 hover:border-brand-teal hover:text-brand-teal",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      {checked ? (
                        <CheckSquare className="h-4 w-4 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 shrink-0" />
                      )}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <Button
                onClick={handleMultiContinue}
                disabled={saving}
                className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white mt-2 flex items-center gap-2"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Text input */}
          {currentStep.type === "text" && (
            <div className="flex gap-2">
              <input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTextContinue();
                }}
                placeholder={currentStep.placeholder}
                disabled={saving}
                className="flex-1 rounded-lg border border-warm-200 dark:border-warm-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal disabled:opacity-50"
              />
              <Button
                onClick={handleTextContinue}
                disabled={saving || !textInput.trim()}
                className="bg-brand-teal hover:bg-brand-teal-dark text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Textarea */}
          {currentStep.type === "textarea" && (
            <div className="space-y-2">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={currentStep.placeholder}
                disabled={saving}
                rows={4}
                className="w-full rounded-lg border border-warm-200 dark:border-warm-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal resize-none disabled:opacity-50"
              />
              <Button
                onClick={handleTextContinue}
                disabled={saving || !textInput.trim()}
                className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white flex items-center gap-2"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
