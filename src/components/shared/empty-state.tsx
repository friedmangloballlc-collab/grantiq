import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function EmptyState({ title, description, actionLabel, actionHref }: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox className="h-12 w-12 text-warm-300 dark:text-warm-600 mb-4" />
      <h3 className="text-lg font-semibold text-warm-700 dark:text-warm-300">{title}</h3>
      <p className="text-sm text-warm-500 mt-1 max-w-md">{description}</p>
      {actionLabel && actionHref && (
        <Button className="mt-4 bg-brand-teal hover:bg-brand-teal-dark text-white"
          render={<Link href={actionHref}>{actionLabel}</Link>} />
      )}
    </div>
  );
}
