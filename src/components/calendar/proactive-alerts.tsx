"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, AlertTriangle, TrendingUp, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertType = "intelligence" | "warning" | "opportunity" | "action";

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  body: string;
}

const ALERT_CONFIG: Record<AlertType, { icon: React.ElementType; classes: string }> = {
  intelligence: {
    icon: Lightbulb,
    classes: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
  },
  warning: {
    icon: AlertTriangle,
    classes: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
  },
  opportunity: {
    icon: TrendingUp,
    classes: "bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300",
  },
  action: {
    icon: RefreshCw,
    classes: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
  },
};

// Static alerts based on fiscal calendar intelligence.
// Real AI prediction will be added in a later phase.
function getStaticAlerts(): Alert[] {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed

  const alerts: Alert[] = [];

  // November: prep for January NOFO wave
  if (month === 10) {
    alerts.push({
      id: "jan-nofo-prep",
      type: "intelligence",
      title: "January NOFO wave incoming",
      body: "USDA NIFA, HHS, and DOE typically post their largest NOFOs in January. Start preparing narratives now.",
    });
  }

  // January–March: peak NOFO season
  if (month >= 0 && month <= 2) {
    alerts.push({
      id: "peak-nofo",
      type: "opportunity",
      title: "Peak NOFO release season",
      body: "Federal agencies are releasing the most opportunities right now. Check Grant Library weekly for new matches.",
    });
  }

  // July–September: Q4 spending surge
  if (month >= 6 && month <= 8) {
    alerts.push({
      id: "q4-surge",
      type: "opportunity",
      title: "Federal Q4 spending surge active",
      body: 'Agencies must spend remaining FY funds. 3+ agencies in your match list release supplements Aug–Sep. "Use it or lose it" is real — watch for emergency NOFAs.',
    });
  }

  // August: SAM.gov reminder (static placeholder)
  if (month === 7) {
    alerts.push({
      id: "sam-renewal",
      type: "action",
      title: "SAM.gov registration check",
      body: "Federal registrations expire annually. Verify your SAM.gov registration is current — a lapsed registration will disqualify your federal applications.",
    });
  }

  // Always-on: foundation board meeting cycle
  // March, June, September, December = board meeting months
  const boardMonths = [2, 5, 8, 11];
  const upcomingBoard = boardMonths.find((m) => m > month);
  const nextBoardMonth = upcomingBoard !== undefined ? upcomingBoard : boardMonths[0];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const loiDeadlineMonth = monthNames[(nextBoardMonth - 2 + 12) % 12];

  alerts.push({
    id: "foundation-board",
    type: "intelligence",
    title: `Foundation LOIs due ~${loiDeadlineMonth}`,
    body: `The next quarterly board meeting cycle is ${monthNames[nextBoardMonth]}. Foundation LOIs are typically due 6–8 weeks prior. Start identifying targets now.`,
  });

  // Year-round: year-end state budget cycle
  if (month >= 3 && month <= 5) {
    alerts.push({
      id: "state-fy-close",
      type: "warning",
      title: "State FY closing June 30",
      body: "Most states close their fiscal year June 30. Final state grant rounds are often competitive. Watch for emergency supplements in April–May.",
    });
  }

  // Fallback: always show at least one actionable alert
  if (alerts.length === 0) {
    alerts.push({
      id: "default-pipeline",
      type: "intelligence",
      title: "Keep your pipeline warm",
      body: "Off-peak periods are the best time to build funder relationships, complete narrative templates, and strengthen your organizational profile.",
    });
  }

  return alerts;
}

export function ProactiveAlerts() {
  const alerts = getStaticAlerts();

  return (
    <Card className="border-warm-200 dark:border-warm-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-warm-900 dark:text-warm-50">
          Intelligence Alerts
        </CardTitle>
        <p className="text-xs text-warm-500">Based on federal fiscal calendar patterns</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => {
          const { icon: Icon, classes } = ALERT_CONFIG[alert.type];
          return (
            <div key={alert.id} className={cn("flex gap-3 p-3 rounded-md border text-xs", classes)}>
              <Icon className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">{alert.title}</p>
                <p className="opacity-80 leading-relaxed">{alert.body}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
