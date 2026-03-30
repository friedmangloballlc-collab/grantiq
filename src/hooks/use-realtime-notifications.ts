"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface NotificationRecord {
  id: string;
  user_id: string;
  org_id: string;
  notification_type: string;
  channel: string;
  content_snapshot: Record<string, unknown> | null;
  sent_at: string;
  opened_at: string | null;
}

export function useRealtimeNotifications(userId: string) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    supabase
      .from("notifications_log")
      .select("*")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          setNotifications(data as NotificationRecord[]);
          setUnreadCount(data.filter((n) => !n.opened_at).length);
        }
      });

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications_log",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as NotificationRecord, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { notifications, unreadCount };
}
