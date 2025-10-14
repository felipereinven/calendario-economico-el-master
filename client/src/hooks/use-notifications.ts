import { useEffect, useRef, useState } from "react";
import { type EconomicEvent } from "@shared/schema";

interface NotificationSettings {
  enabled: boolean;
  impactLevels: ("high" | "medium" | "low")[];
}

export function useNotifications(
  events: EconomicEvent[] | undefined,
  settings: NotificationSettings
) {
  // Use cumulative set that persists across filter changes
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const [newEventCount, setNewEventCount] = useState(0);

  useEffect(() => {
    if (!events || !settings.enabled || !("Notification" in window)) {
      return;
    }

    if (Notification.permission !== "granted") {
      return;
    }

    const newEvents = events.filter((event) => {
      const isNew = !seenEventIdsRef.current.has(event.id);
      const matchesImpact = settings.impactLevels.includes(event.impact);
      return isNew && matchesImpact;
    });

    // Only notify if we have seen events before (not on initial load)
    if (newEvents.length > 0 && seenEventIdsRef.current.size > 0) {
      setNewEventCount((prev) => prev + newEvents.length);

      newEvents.forEach((event) => {
        const notification = new Notification("New Economic Event", {
          body: `${event.country}: ${event.event} (${event.impact.toUpperCase()} impact)`,
          icon: "/favicon.ico",
          tag: event.id,
          requireInteraction: false,
        });

        setTimeout(() => notification.close(), 5000);
      });
    }

    // Add new events to cumulative seen set (maintains across filter changes)
    events.forEach((event) => {
      seenEventIdsRef.current.add(event.id);
    });
  }, [events, settings]);

  const clearNotificationBadge = () => {
    setNewEventCount(0);
  };

  return { newEventCount, clearNotificationBadge };
}
