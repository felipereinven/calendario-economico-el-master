import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { type EconomicEvent } from "@shared/schema";

interface EventNotification {
  id: number;
  sessionId: string;
  eventId: string;
  eventTimestamp: Date;
  minutesBefore: number;
  notificationSent: Date | null;
  createdAt: Date;
}

export function useEventNotifications(
  events: EconomicEvent[] | undefined,
  sessionId: string,
  timezone: string
) {
  const notifiedIdsRef = useRef<Set<number>>(new Set());

  // Fetch pending notifications every 30 seconds
  const { data: pendingNotifications = [] } = useQuery<EventNotification[]>({
    queryKey: ['/api/notifications/pending'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/pending', {
        headers: { 'x-session-id': sessionId },
      });
      if (!response.ok) throw new Error('Failed to fetch pending notifications');
      return response.json();
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  useEffect(() => {
    if (!events || !("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    // Process pending notifications
    for (const notification of pendingNotifications) {
      // Skip if already notified
      if (notifiedIdsRef.current.has(notification.id)) {
        continue;
      }

      // Find the event
      const event = events.find((e) => e.id === notification.eventId);
      if (!event) continue;

      // Check if it's time to notify
      const eventTime = new Date(notification.eventTimestamp);
      const notificationTime = new Date(eventTime.getTime() - notification.minutesBefore * 60 * 1000);
      const now = new Date();

      if (notificationTime <= now && !notification.notificationSent) {
        // Send browser notification
        const browserNotification = new Notification("Recordatorio de Evento Económico", {
          body: `En ${notification.minutesBefore} minutos: ${event.country} - ${event.event}`,
          icon: "/favicon.ico",
          tag: `event-${notification.id}`,
          requireInteraction: false,
        });

        // Auto-close after 10 seconds
        setTimeout(() => browserNotification.close(), 10000);

        // Mark as notified locally
        notifiedIdsRef.current.add(notification.id);
      }
    }
  }, [pendingNotifications, events]);

  return {
    pendingCount: pendingNotifications.length,
  };
}
