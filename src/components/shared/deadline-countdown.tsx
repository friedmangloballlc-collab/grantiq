"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

function subscribeToTime(cb: () => void) {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
}

function getTimeSnapshot() {
  return Date.now();
}

export function DeadlineCountdown({ deadline }: { deadline: string }) {
  const now = useSyncExternalStore(subscribeToTime, getTimeSnapshot, getTimeSnapshot);
  const days = Math.ceil((new Date(deadline).getTime() - now) / (1000 * 60 * 60 * 24));
  const color = days <= 3 ? "text-red-500" : days <= 14 ? "text-amber-500" : "text-green-600";
  const label = days < 0 ? "Expired" : days === 0 ? "Today" : `${days}d left`;

  return <span className={cn("text-xs font-medium", color)}>{label}</span>;
}
