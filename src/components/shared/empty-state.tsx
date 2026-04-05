import {
  Inbox,
  Kanban,
  PenLine,
  CalendarDays,
  FolderLock,
  BarChart3,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type VariantKey =
  | "pipeline"
  | "writing"
  | "calendar"
  | "vault"
  | "analytics"
  | "matches";

interface VariantConfig {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}

const VARIANTS: Record<VariantKey, VariantConfig> = {
  pipeline: {
    icon: Kanban,
    title: "Your pipeline is empty",
    description:
      "Add grants from your matches to start tracking applications.",
    actionLabel: "Browse Matches",
    actionHref: "/matches",
  },
  writing: {
    icon: PenLine,
    title: "No writing projects yet",
    description:
      "Start an AI-assisted grant application from any grant in your pipeline.",
    actionLabel: "Go to Pipeline",
    actionHref: "/pipeline",
  },
  calendar: {
    icon: CalendarDays,
    title: "No upcoming deadlines",
    description:
      "Add grants to your pipeline to see deadlines and work-back timelines here.",
    actionLabel: "Browse Matches",
    actionHref: "/matches",
  },
  vault: {
    icon: FolderLock,
    title: "No documents uploaded",
    description:
      "Upload key documents like your 501(c)(3) letter, financials, and board list to improve match accuracy.",
    actionLabel: "Upload Documents",
    actionHref: "/vault",
  },
  analytics: {
    icon: BarChart3,
    title: "No outcomes logged yet",
    description:
      "When grants move to Awarded or Declined in your pipeline, log the outcome to start tracking analytics.",
    actionLabel: "Go to Pipeline",
    actionHref: "/pipeline",
  },
  matches: {
    icon: Search,
    title: "No matches yet",
    description:
      "Complete your organization profile to get AI-powered grant matches.",
    actionLabel: "Complete Profile",
    actionHref: "/onboarding",
  },
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  variant,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  variant?: string;
}) {
  const config = variant ? VARIANTS[variant as VariantKey] : undefined;

  const resolvedTitle = config?.title ?? title ?? "";
  const resolvedDescription = config?.description ?? description ?? "";
  const resolvedActionLabel = config?.actionLabel ?? actionLabel;
  const resolvedActionHref = config?.actionHref ?? actionHref;
  const Icon = config?.icon ?? Inbox;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="h-12 w-12 text-warm-300 dark:text-warm-600 mb-4" />
      <h3 className="text-lg font-semibold text-warm-700 dark:text-warm-300">
        {resolvedTitle}
      </h3>
      <p className="text-sm text-warm-500 mt-1 max-w-md">{resolvedDescription}</p>
      {resolvedActionLabel && resolvedActionHref && (
        <Button
          className="mt-4 bg-brand-teal hover:bg-brand-teal-dark text-white"
          render={
            <Link href={resolvedActionHref}>{resolvedActionLabel}</Link>
          }
        />
      )}
    </div>
  );
}
