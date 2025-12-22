import { refreshEventsCache } from "./server/services/events-cache";

// Refresh December 2025 to January 2026
async function refreshDates() {
  const fromDate = "2025-12-01";
  const toDate = "2026-01-31";
  
  console.log(`Starting refresh for ${fromDate} to ${toDate}...`);
  
  try {
    await refreshEventsCache(fromDate, toDate);
    console.log("✅ Refresh completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Refresh failed:", error);
    process.exit(1);
  }
}

refreshDates();
