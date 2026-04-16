"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield, AlertTriangle, CheckCircle2, Clock, Calendar, ExternalLink,
  RefreshCw, Loader2, Bell, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ComplianceEvent {
  id: string;
  event_type: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  risk_if_missed: string;
  action_url: string;
  recurrence: string;
  completed_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  overdue: { label: "Overdue", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20" },
  due_soon: { label: "Due Soon", icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20" },
  upcoming: { label: "Upcoming", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
};

const TYPE_LABELS: Record<string, string> = {
  sam_renewal: "SAM.gov",
  "990_filing": "IRS 990",
  state_annual_report: "State Filing",
  insurance_renewal: "Insurance",
  charitable_registration: "Charitable Reg",
  good_standing: "Good Standing",
  ein_verification: "Tax/EIN",
  audit_due: "Audit",
  board_meeting: "Board Meeting",
  coi_renewal: "COI Disclosure",
  uei_renewal: "UEI",
  custom: "Custom",
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function EventCard({ event, onComplete, onDismiss }: {
  event: ComplianceEvent; onComplete: (id: string) => void; onDismiss: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.upcoming;
  const StatusIcon = config.icon;
  const days = daysUntil(event.due_date);

  return (
    <div className={cn("rounded-lg border p-4", event.status === "overdue" ? "border-red-200 dark:border-red-800" : "border-border")}>
      <div className="flex items-start gap-3">
        <StatusIcon className={cn("h-5 w-5 shrink-0 mt-0.5", config.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-sm">{event.title}</h3>
            <span className={cn("text-xs px-2 py-0.5 rounded-full", config.bg, config.color)}>
              {config.label}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {TYPE_LABELS[event.event_type] ?? event.event_type}
            </span>
            {event.recurrence !== "one_time" && (
              <span className="text-xs text-muted-foreground">{event.recurrence}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Due: <strong>{formatDate(event.due_date)}</strong>
            {days > 0 ? ` (${days} days)` : days === 0 ? " (today)" : ` (${Math.abs(days)} days overdue)`}
          </p>

          {expanded && (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-muted-foreground">{event.description}</p>
              {event.risk_if_missed && (
                <div className="rounded bg-red-50 dark:bg-red-950/20 px-3 py-2">
                  <p className="text-xs text-red-700 dark:text-red-400">
                    <strong>Risk if missed:</strong> {event.risk_if_missed}
                  </p>
                </div>
              )}
              <div className="flex gap-2 mt-2">
                {event.action_url && (
                  <a href={event.action_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1 text-xs">
                      Take Action <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                )}
                {event.status !== "completed" && (
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onComplete(event.id)}>
                    <CheckCircle2 className="h-3 w-3" /> Mark Complete
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => onDismiss(event.id)}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>
        <button type="button" onClick={() => setExpanded(!expanded)} className="shrink-0 p-1">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function ComplianceCalendarPage() {
  const [events, setEvents] = useState<ComplianceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function loadEvents() {
    try {
      const res = await fetch("/api/compliance");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  async function generateEvents() {
    setGenerating(true);
    try {
      await fetch("/api/compliance", { method: "POST" });
      await loadEvents();
    } catch { /* ignore */ } finally {
      setGenerating(false);
    }
  }

  async function updateEvent(eventId: string, status: string) {
    await fetch("/api/compliance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, status }),
    });
    await loadEvents();
  }

  useEffect(() => { loadEvents(); }, []);

  const overdue = events.filter((e) => e.status === "overdue");
  const dueSoon = events.filter((e) => e.status === "due_soon");
  const upcoming = events.filter((e) => e.status === "upcoming");
  const completed = events.filter((e) => e.status === "completed");

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-50">Compliance Calendar</h1>
          <p className="text-sm text-warm-500 mt-1">
            Track deadlines that keep you grant-eligible. Miss one and you could lose access to funding.
          </p>
        </div>
        <Button variant="outline" onClick={generateEvents} disabled={generating} className="gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {events.length === 0 ? "Generate Calendar" : "Refresh"}
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-brand-teal mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Set Up Your Compliance Calendar</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              We&apos;ll analyze your organization profile and automatically create reminders for
              SAM.gov renewals, 990 filings, state reports, insurance, and more.
            </p>
            <Button onClick={generateEvents} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              Generate My Calendar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3 text-center">
              <p className="text-xl font-bold text-red-600">{overdue.length}</p>
              <p className="text-xs text-red-600">Overdue</p>
            </div>
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3 text-center">
              <p className="text-xl font-bold text-amber-600">{dueSoon.length}</p>
              <p className="text-xs text-amber-600">Due Soon</p>
            </div>
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-3 text-center">
              <p className="text-xl font-bold text-blue-600">{upcoming.length}</p>
              <p className="text-xs text-blue-600">Upcoming</p>
            </div>
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-center">
              <p className="text-xl font-bold text-emerald-600">{completed.length}</p>
              <p className="text-xs text-emerald-600">Completed</p>
            </div>
          </div>

          {/* Overdue */}
          {overdue.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-semibold text-red-600 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Overdue ({overdue.length})
              </h2>
              <div className="space-y-3">
                {overdue.map((e) => (
                  <EventCard key={e.id} event={e} onComplete={(id) => updateEvent(id, "completed")} onDismiss={(id) => updateEvent(id, "dismissed")} />
                ))}
              </div>
            </div>
          )}

          {/* Due Soon */}
          {dueSoon.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-semibold text-amber-600 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Due Soon ({dueSoon.length})
              </h2>
              <div className="space-y-3">
                {dueSoon.map((e) => (
                  <EventCard key={e.id} event={e} onComplete={(id) => updateEvent(id, "completed")} onDismiss={(id) => updateEvent(id, "dismissed")} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-semibold text-blue-600 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Upcoming ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map((e) => (
                  <EventCard key={e.id} event={e} onComplete={(id) => updateEvent(id, "completed")} onDismiss={(id) => updateEvent(id, "dismissed")} />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-semibold text-emerald-600 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Completed ({completed.length})
              </h2>
              <div className="space-y-3">
                {completed.map((e) => (
                  <EventCard key={e.id} event={e} onComplete={(id) => updateEvent(id, "completed")} onDismiss={(id) => updateEvent(id, "dismissed")} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
