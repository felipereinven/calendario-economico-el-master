import { refreshEventsCache } from "./events-cache";
import { storage } from "../storage";
import { getRefreshRange } from "../utils/date-range";

// Lock to prevent concurrent refresh jobs
let isRefreshing = false;
let lastRefreshTime = 0;

const COUNTRIES = ['USA', 'EUR', 'DEU', 'FRA', 'ESP', 'GBR', 'CHN', 'JPN'];

/**
 * Nightly job: Refresh events for current month + next 60 days
 */
export async function refreshMonthlyCache(): Promise<void> {
  if (isRefreshing) {
    console.log("Monthly refresh skipped: another refresh is in progress");
    return;
  }

  try {
    isRefreshing = true;
    console.log("Starting monthly cache refresh...");

    // Start from beginning of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const fromDate = startOfMonth.toISOString().split('T')[0];

    // Refresh for 90 days forward (3 months)
    const range = getRefreshRange(90);
    await refreshEventsCache(fromDate, range.endDate, COUNTRIES);

    // Clean up old events (keep 180 days / 6 months)
    await storage.deleteOldCachedEvents(180);

    lastRefreshTime = Date.now();
    console.log("Monthly cache refresh complete");
  } catch (error) {
    console.error("Monthly refresh failed:", error);
  } finally {
    isRefreshing = false;
  }
}

/**
 * Hourly job: Refresh events for today ±7 days
 */
export async function refreshRollingWindow(): Promise<void> {
  if (isRefreshing) {
    console.log("Hourly refresh skipped: another refresh is in progress");
    return;
  }

  try {
    isRefreshing = true;
    console.log("Starting rolling window refresh...");

    // Today ±7 days (14 days total)
    const range = getRefreshRange(14);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const from = sevenDaysAgo.toISOString().split('T')[0];
    const to = range.endDate;

    await refreshEventsCache(from, to, COUNTRIES);

    lastRefreshTime = Date.now();
    console.log("Rolling window refresh complete");
  } catch (error) {
    console.error("Hourly refresh failed:", error);
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

  // Run rolling window refresh every hour (but skip first run if doing initial refresh)
  const runHourly = async () => {
    // Check if we need initial data load first
    const latestDate = await storage.getLatestCachedDate();
    
    if (latestDate) {
      // Cache exists, run normal hourly refresh immediately
      refreshRollingWindow();
    } else {
      console.log("Skipping initial hourly refresh - waiting for initial data load");
    }
    
    // Schedule hourly refresh
    setInterval(refreshRollingWindow, 60 * 60 * 1000); // Every hour
    console.log("Hourly refresh initialized");
  };

  // Start jobs
  runNightly();
  runHourly();

  // Run initial refresh if no data exists (should run first before hourly)
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
      console.log("No cached data found, running initial month + next week refresh...");
      
      try {
        // Load current month + next 67 days (~2 months to ensure full coverage)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const fromDate = startOfMonth.toISOString().split('T')[0];
        const range = getRefreshRange(67);
        
        await refreshEventsCache(fromDate, range.endDate, COUNTRIES);
        
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
