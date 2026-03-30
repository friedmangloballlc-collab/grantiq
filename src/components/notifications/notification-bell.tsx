"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const { notifications, unreadCount } = useRealtimeNotifications(userId);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-warm-200 dark:border-warm-800">
          <h3 className="font-semibold text-sm text-warm-900 dark:text-warm-50">Notifications</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-warm-500 text-center">No notifications yet</p>
          ) : (
            notifications.slice(0, 10).map((n) => (
              <div
                key={n.id}
                className={cn(
                  "p-3 border-b border-warm-100 dark:border-warm-800 text-sm last:border-0",
                  !n.opened_at && "bg-brand-teal/5"
                )}
              >
                <p className="text-warm-900 dark:text-warm-50">
                  {(n.content_snapshot as { title?: string } | null)?.title ?? n.notification_type}
                </p>
                <p className="text-xs text-warm-400 mt-1">
                  {new Date(n.sent_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
