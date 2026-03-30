import { Clock } from "lucide-react";

interface ChangeItem {
  id: string;
  type: "new_match" | "deadline" | "pipeline_update" | "readiness_change";
  message: string;
  timestamp: string;
}

export function WhatsChanged({ items }: { items: ChangeItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-50">What&apos;s Changed</h2>
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-warm-800/50 border border-warm-200 dark:border-warm-800">
            <Clock className="h-4 w-4 text-warm-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-warm-700 dark:text-warm-300">{item.message}</p>
              <p className="text-xs text-warm-400 mt-0.5">{new Date(item.timestamp).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
