import { refreshAllRanges } from "./investing-scraper";
import { storage } from "../storage";

// Lock to prevent concurrent refresh jobs
let isRefreshing = false;
let lastRefreshTime = 0;

/**
 * Nightly job: Refresh events from Investing.com (all ranges)
 */
export async function refreshMonthlyCache(): Promise<void> {
  if (isRefreshing) {
    console.log("Monthly refresh skipped: another refresh is in progress");
    return;
  }

  try {
    isRefreshing = true;
    console.log("Starting cache refresh from Investing.com...");

    // Refrescar todos los rangos del scraper
    await refreshAllRanges();

    // Limpiar eventos antiguos (mantener 180 días / 6 meses)
    await storage.deleteOldCachedEvents(180);

    lastRefreshTime = Date.now();
    console.log("Cache refresh complete");
  } catch (error) {
    console.error("Cache refresh failed:", error);
  } finally {
    isRefreshing = false;
  }
}

/**
 * Daily job: Refresh today and tomorrow events
 */
export async function refreshDailyWindow(): Promise<void> {
  if (isRefreshing) {
    console.log("Daily refresh skipped: another refresh is in progress - will retry in 30 minutes");
    setTimeout(refreshDailyWindow, 30 * 60 * 1000);
    return;
  }

  try {
    isRefreshing = true;
    console.log("Starting daily refresh from Investing.com...");

    // Solo refrescar today y tomorrow (más frecuente)
    const { getInvestingEvents } = await import("./investing-scraper");
    await getInvestingEvents("today");
    await getInvestingEvents("tomorrow");

    lastRefreshTime = Date.now();
    console.log("Daily refresh complete");
  } catch (error) {
    console.error("Daily refresh failed:", error);
  } finally {
    isRefreshing = false;
  }
}

/**
 * Initialize background refresh jobs
 */
export function initializeRefreshJobs(): void {
  console.log("Initializing cache refresh jobs...");

  // Run monthly refresh daily at 2 AM
  const runNightly = () => {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(2, 0, 0, 0);
    
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const delay = nextRun.getTime() - now.getTime();
    
    setTimeout(() => {
      refreshMonthlyCache();
      // Schedule next run
      setInterval(refreshMonthlyCache, 24 * 60 * 60 * 1000); // Every 24 hours
    }, delay);

    console.log(`Monthly refresh scheduled for ${nextRun.toISOString()}`);
  };

  // Run daily window refresh at 14:00 UTC (12 hours after monthly job)
  const runDaily = async () => {
    // Check if we should run immediately on startup
    const latestDate = await storage.getLatestCachedDate();
    
    if (latestDate) {
      // Cache exists, run immediate refresh on startup
      console.log("Running immediate daily window refresh on startup...");
      refreshDailyWindow();
    } else {
      console.log("Skipping initial daily refresh - waiting for bootstrap");
    }
    
    // Schedule next run at 14:00 UTC
    const now = new Date();
    const nextRun = new Date();
    nextRun.setUTCHours(14, 0, 0, 0);
    
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const delay = nextRun.getTime() - now.getTime();
    
    setTimeout(() => {
      refreshDailyWindow();
      // Schedule next run every 24 hours
      setInterval(refreshDailyWindow, 24 * 60 * 60 * 1000);
    }, delay);

    console.log(`Daily window refresh scheduled for ${nextRun.toISOString()}`);
  };

  // Start jobs
  runNightly();
  runDaily();

  // Run initial bootstrap if no data exists
  checkInitialData();
}

/**
 * Check if initial data exists, if not, trigger full month refresh
 */
async function checkInitialData(): Promise<void> {
  try {
    const latestDate = await storage.getLatestCachedDate();
    
    if (!latestDate) {
      if (isRefreshing) {
        console.log("Initial data check skipped: another refresh is in progress");
        return;
      }
      
      isRefreshing = true;
      console.log("No cached data found, running initial refresh from Investing.com...");
      
      try {
        // Refresh all ranges from Investing.com scraper
        await refreshAllRanges();
        
        lastRefreshTime = Date.now();
        console.log("Initial data refresh complete");
      } finally {
        isRefreshing = false;
      }
    } else {
      console.log(`Latest cached date: ${latestDate}`);
    }
  } catch (error) {
    console.error("Error checking initial data:", error);
    isRefreshing = false;
  }
}

/**
 * Get cache status
 */
export function getCacheStatus(): {
  isRefreshing: boolean;
  lastRefreshTime: number;
  lastRefreshAge: string;
} {
  const age = lastRefreshTime ? Date.now() - lastRefreshTime : 0;
  const ageMinutes = Math.round(age / 1000 / 60);
  
  return {
    isRefreshing,
    lastRefreshTime,
    lastRefreshAge: ageMinutes > 0 ? `${ageMinutes} minutes ago` : "Never",
  };
}
