"use client";

import { AlertCircle, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FocusItem {
  id: string;
  priority: "urgent" | "this_week" | "opportunity";
  title: string;
  action: string;
  actionHref: string;
  estimatedTime: string;
}

const PRIORITY_CONFIG = {
  urgent: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800" },
  this_week: { icon: Clock, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800" },
  opportunity: { icon: TrendingUp, color: "text-brand-teal", bg: "bg-teal-50 dark:bg-teal-950/30", border: "border-teal-200 dark:border-teal-800" },
};

export function TodaysFocus({ items }: { items: FocusItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-50">Today&apos;s Focus</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {items.slice(0, 3).map((item) => {
          const config = PRIORITY_CONFIG[item.priority];
          const Icon = config.icon;
          return (
            <Card key={item.id} className={cn("border", config.border, config.bg)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-warm-900 dark:text-warm-50">{item.title}</p>
                    <p className="text-xs text-warm-500 mt-1">About {item.estimatedTime}</p>
                  </div>
                </div>
                <Button size="sm" className="mt-3 w-full bg-brand-teal hover:bg-brand-teal-dark text-white"
                  render={<a href={item.actionHref}>{item.action}</a>} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
