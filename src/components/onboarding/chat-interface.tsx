"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Square, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProfileData } from "./profile-card";
import { FileUpload } from "./file-upload";

// ─── Step Definitions ────────────────────────────────────────────────────────

type StepType = "single_select" | "multi_select" | "text" | "textarea" | "file_upload" | "searchable_select";

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
    subtitle: "Type to search or scroll to browse",
    type: "searchable_select" as StepType,
    options: [
      { label: "Airlines/Aviation", value: "airlines_aviation" },
      { label: "Alternative Dispute Resolution", value: "alternative_dispute_resolution" },
      { label: "Alternative Medicine", value: "alternative_medicine" },
      { label: "Animation", value: "animation" },
      { label: "Apparel & Fashion", value: "apparel_fashion" },
      { label: "Architecture & Planning", value: "architecture_planning" },
      { label: "Arts And Crafts", value: "arts_crafts" },
      { label: "Automotive", value: "automotive" },
      { label: "Aviation & Aerospace", value: "aviation_aerospace" },
      { label: "Banking", value: "banking" },
      { label: "Biotechnology", value: "biotechnology" },
      { label: "Broadcast Media", value: "broadcast_media" },
      { label: "Building Materials", value: "building_materials" },
      { label: "Business Supplies And Equipment", value: "business_supplies" },
      { label: "Chemicals", value: "chemicals" },
      { label: "Civic & Social Organization", value: "civic_social" },
      { label: "Civil Engineering", value: "civil_engineering" },
      { label: "Commercial Real Estate", value: "commercial_real_estate" },
      { label: "Computer & Network Security", value: "computer_security" },
      { label: "Computer Games", value: "computer_games" },
      { label: "Computer Hardware", value: "computer_hardware" },
      { label: "Computer Networking", value: "computer_networking" },
      { label: "Computer Software", value: "computer_software" },
      { label: "Construction", value: "construction" },
      { label: "Consumer Electronics", value: "consumer_electronics" },
      { label: "Consumer Goods", value: "consumer_goods" },
      { label: "Consumer Services", value: "consumer_services" },
      { label: "Cosmetics", value: "cosmetics" },
      { label: "Dairy", value: "dairy" },
      { label: "Defense & Space", value: "defense_space" },
      { label: "Design", value: "design" },
      { label: "E-Learning", value: "elearning" },
      { label: "Education Management", value: "education_management" },
      { label: "Electrical/Electronic Manufacturing", value: "electrical_manufacturing" },
      { label: "Entertainment", value: "entertainment" },
      { label: "Environmental Services", value: "environmental_services" },
      { label: "Facilities Services", value: "facilities_services" },
      { label: "Farming", value: "farming" },
      { label: "Financial Services", value: "financial_services" },
      { label: "Fine Art", value: "fine_art" },
      { label: "Fishery", value: "fishery" },
      { label: "Food & Beverages", value: "food_beverages" },
      { label: "Food Production", value: "food_production" },
      { label: "Furniture", value: "furniture" },
      { label: "Glass, Ceramics & Concrete", value: "glass_ceramics" },
      { label: "Government Administration", value: "government_admin" },
      { label: "Graphic Design", value: "graphic_design" },
      { label: "Health, Wellness And Fitness", value: "health_wellness" },
      { label: "Higher Education", value: "higher_education" },
      { label: "Hospital & Health Care", value: "hospital_healthcare" },
      { label: "Hospitality", value: "hospitality" },
      { label: "Human Resources", value: "human_resources" },
      { label: "Import And Export", value: "import_export" },
      { label: "Individual & Family Services", value: "family_services" },
      { label: "Industrial Automation", value: "industrial_automation" },
      { label: "Information Services", value: "information_services" },
      { label: "Information Technology And Services", value: "it_services" },
      { label: "Insurance", value: "insurance" },
      { label: "International Affairs", value: "international_affairs" },
      { label: "International Trade And Development", value: "international_trade" },
      { label: "Internet", value: "internet" },
      { label: "Law Enforcement", value: "law_enforcement" },
      { label: "Legal Services", value: "legal_services" },
      { label: "Leisure, Travel & Tourism", value: "leisure_travel" },
      { label: "Libraries", value: "libraries" },
      { label: "Logistics And Supply Chain", value: "logistics" },
      { label: "Luxury Goods & Jewelry", value: "luxury_goods" },
      { label: "Machinery", value: "machinery" },
      { label: "Maritime", value: "maritime" },
      { label: "Mechanical Or Industrial Engineering", value: "mechanical_engineering" },
      { label: "Media Production", value: "media_production" },
      { label: "Medical Devices", value: "medical_devices" },
      { label: "Medical Practice", value: "medical_practice" },
      { label: "Mental Health Care", value: "mental_health" },
      { label: "Mining & Metals", value: "mining_metals" },
      { label: "Motion Pictures And Film", value: "film" },
      { label: "Museums And Institutions", value: "museums" },
      { label: "Music", value: "music" },
      { label: "Nanotechnology", value: "nanotechnology" },
      { label: "Newspapers", value: "newspapers" },
      { label: "Non-Profit Organization Management", value: "nonprofit_management" },
      { label: "Oil & Energy", value: "oil_energy" },
      { label: "Online Media", value: "online_media" },
      { label: "Package/Freight Delivery", value: "freight_delivery" },
      { label: "Packaging And Containers", value: "packaging" },
      { label: "Paper & Forest Products", value: "paper_forest" },
      { label: "Performing Arts", value: "performing_arts" },
      { label: "Pharmaceuticals", value: "pharmaceuticals" },
      { label: "Philanthropy", value: "philanthropy" },
      { label: "Photography", value: "photography" },
      { label: "Plastics", value: "plastics" },
      { label: "Primary/Secondary Education", value: "k12_education" },
      { label: "Printing", value: "printing" },
      { label: "Professional Training & Coaching", value: "professional_training" },
      { label: "Program Development", value: "program_development" },
      { label: "Public Policy", value: "public_policy" },
      { label: "Public Safety", value: "public_safety" },
      { label: "Publishing", value: "publishing" },
      { label: "Railroad Manufacture", value: "railroad" },
      { label: "Ranching", value: "ranching" },
      { label: "Real Estate", value: "real_estate" },
      { label: "Recreational Facilities And Services", value: "recreation" },
      { label: "Religious Institutions", value: "religious" },
      { label: "Renewables & Environment", value: "renewables" },
      { label: "Research", value: "research" },
      { label: "Restaurants", value: "restaurants" },
      { label: "Retail", value: "retail" },
      { label: "Security And Investigations", value: "security" },
      { label: "Semiconductors", value: "semiconductors" },
      { label: "Shipbuilding", value: "shipbuilding" },
      { label: "Sporting Goods", value: "sporting_goods" },
      { label: "Sports", value: "sports" },
      { label: "Supermarkets", value: "supermarkets" },
      { label: "Telecommunications", value: "telecommunications" },
      { label: "Textiles", value: "textiles" },
      { label: "Think Tanks", value: "think_tanks" },
      { label: "Translation And Localization", value: "translation" },
      { label: "Transportation/Trucking/Railroad", value: "transportation" },
      { label: "Utilities", value: "utilities" },
      { label: "Veterinary", value: "veterinary" },
      { label: "Warehousing", value: "warehousing" },
      { label: "Wholesale", value: "wholesale" },
      { label: "Wine And Spirits", value: "wine_spirits" },
      { label: "Wireless", value: "wireless" },
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
    id: "business_model",
    question: "Tell us about your business setup",
    subtitle: "This helps identify specialized grant opportunities",
    type: "single_select",
    options: [
      { label: "Remote/Virtual Business", value: "remote" },
      { label: "Home Based Business", value: "home_based" },
      { label: "Online Business", value: "online" },
      { label: "Physical Location", value: "physical" },
      { label: "No Physical Location Yet", value: "no_location" },
    ],
  },
  {
    id: "phone",
    question: "What's your phone number?",
    subtitle: "So our advisory team can reach you if needed",
    type: "text",
    placeholder: "e.g. (305) 555-1234",
  },
  {
    id: "contact_method",
    question: "How would you prefer to be contacted?",
    subtitle: "Your information is confidential",
    type: "single_select",
    options: [
      { label: "Email", value: "email" },
      { label: "Phone Call", value: "phone" },
      { label: "Text Message", value: "text" },
    ],
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
    id: "document_upload",
    question: "Upload your documents",
    subtitle:
      "Drag and drop files or click to browse. You can skip this and upload later from Settings.",
    type: "file_upload" as StepType,
    showIf: (answers) => {
      const docs = answers.documents;
      if (!docs) return false;
      if (typeof docs === "string") return docs !== "none";
      return docs.length > 0 && !docs.includes("none");
    },
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
    case "business_model":
      return { business_model: value as string };
    case "phone":
      return { phone: value as string };
    case "contact_method":
      return { contact_method: value as string };
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
    case "document_upload":
      // value is the uploaded doc count as a string
      return {};
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
  const [completing, setCompleting] = useState(false);
  const [encIndex, setEncIndex] = useState(0);
  const [industrySearch, setIndustrySearch] = useState("");

  const visibleSteps = getVisibleSteps(answers);
  const currentStep = visibleSteps[currentStepIndex];
  const totalSteps = visibleSteps.length;

  // Reset multi/text input when step changes
  useEffect(() => {
    setTextInput("");
    setMultiSelected([]);
    setIndustrySearch("");
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
    const handleGoToDashboard = async () => {
      setCompleting(true);
      try {
        await fetch("/api/onboarding/complete", { method: "POST" });
      } catch {
        // Non-blocking — proceed to dashboard even if this fails
      }
      // Brief pause so the user sees the "Finding your grants" state
      await new Promise((resolve) => setTimeout(resolve, 2500));
      window.location.href = "/dashboard";
    };

    if (completing) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center py-12">
          <div className="w-12 h-12 rounded-full border-4 border-brand-teal border-t-transparent animate-spin" />
          <h3 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
            Finding your grants...
          </h3>
          <p className="text-warm-500 max-w-sm">
            Our AI is matching your profile to thousands of grant opportunities.
          </p>
        </div>
      );
    }

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
          onClick={() => void handleGoToDashboard()}
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

          {/* Searchable select */}
          {currentStep.type === "searchable_select" && currentStep.options && (() => {
            const allOptions = currentStep.options;
            const filtered = industrySearch.trim()
              ? allOptions.filter((o) =>
                  o.label.toLowerCase().includes(industrySearch.trim().toLowerCase())
                )
              : allOptions;
            return (
              <div className="space-y-2">
                <input
                  value={industrySearch}
                  onChange={(e) => setIndustrySearch(e.target.value)}
                  placeholder="Search industries..."
                  disabled={saving}
                  autoFocus
                  className="w-full rounded-lg border border-warm-200 dark:border-warm-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal disabled:opacity-50"
                />
                <p className="text-xs text-warm-400">
                  Showing {filtered.length} of {allOptions.length} industries
                </p>
                <div
                  className="overflow-y-auto rounded-lg border border-warm-200 dark:border-warm-700"
                  style={{ maxHeight: "300px" }}
                >
                  {filtered.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-warm-400">No industries match your search.</p>
                  ) : (
                    filtered.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          if (saving) return;
                          setTimeout(() => void advance(opt.value), 500);
                        }}
                        disabled={saving}
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-100",
                          "text-warm-800 dark:text-warm-200",
                          "hover:bg-brand-teal/10 hover:text-brand-teal",
                          "border-b border-warm-100 dark:border-warm-700 last:border-b-0",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })()}

          {/* File upload */}
          {currentStep.type === "file_upload" && (
            <FileUpload
              onComplete={(uploadedCount) => {
                void advance(String(uploadedCount));
              }}
              onSkip={() => {
                void advance("0");
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
