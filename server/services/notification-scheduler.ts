import { storage } from "../storage";
import { log } from "../vite";

// Check for pending notifications every minute
const CHECK_INTERVAL = 60 * 1000; // 1 minute in milliseconds

let intervalId: NodeJS.Timeout | null = null;

export function startNotificationScheduler() {
  if (intervalId) {
    log("⚠️ Notification scheduler already running");
    return;
  }

  log("🔔 Starting notification scheduler...");

  // Run immediately on start
  checkAndSendNotifications();

  // Then run every minute
  intervalId = setInterval(() => {
    checkAndSendNotifications();
  }, CHECK_INTERVAL);
}

export function stopNotificationScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    log("🔕 Notification scheduler stopped");
  }
}

async function checkAndSendNotifications() {
  try {
    const now = new Date();
    const pendingNotifications = await storage.getPendingNotifications(now);

    if (pendingNotifications.length === 0) {
      return; // No notifications to send
    }

    log(`🔔 Found ${pendingNotifications.length} pending notification(s)`);

    for (const notification of pendingNotifications) {
      try {
        // Calculate notification time
        const eventTime = new Date(notification.eventTimestamp);
        const notificationTime = new Date(eventTime.getTime() - notification.minutesBefore * 60 * 1000);

        // Only send if it's time or past due
        if (notificationTime <= now) {
          log(`📬 Sending notification for event ${notification.eventId} (${notification.minutesBefore} min before)`);
          
          // Mark as sent in database
          await storage.markNotificationAsSent(notification.id);
          
          // Note: Browser notifications are handled client-side via the notification service
          // This just tracks which notifications should be sent
          // The client will poll for pending notifications or use WebSocket/SSE in production
        }
      } catch (error) {
        log(`❌ Error processing notification ${notification.id}: ${error}`);
      }
    }
  } catch (error) {
    log(`❌ Error checking notifications: ${error}`);
  }
}
