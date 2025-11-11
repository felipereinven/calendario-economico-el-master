import { format, parseISO } from "date-fns";
import { createHash } from "crypto";
import { storage } from "../storage";
import { translateEventName } from "../utils/event-taxonomy";
import type { InsertCachedEvent } from "@shared/schema";

const FINNWORLDS_API_KEY = process.env.FINNWORLDS_API_KEY || "";
const FINNWORLDS_BASE_URL = "https://api.finnworlds.com/api/v1";
const REQUEST_DELAY = 3000; // 3 seconds between requests (20/min limit)

// Country code mappings: ISO-3 to ISO-2 for API requests
const iso3ToIso2: Record<string, string> = {
  'USA': 'us',
  'EUR': 'eu', // Eurozone uses 'eu' in API
  'DEU': 'de',
  'FRA': 'fr',
  'ESP': 'es',
  'GBR': 'gb',
  'CHN': 'cn',
  'JPN': 'jp',
};

// ISO-2 to ISO-3 for response normalization
const iso2ToIso3: Record<string, string> = {
  'us': 'USA',
  'US': 'USA',
  'eu': 'EUR',
  'EU': 'EUR',
  'de': 'DEU',
  'DE': 'DEU',
  'fr': 'FRA',
  'FR': 'FRA',
  'es': 'ESP',
  'ES': 'ESP',
  'gb': 'GBR',
  'GB': 'GBR',
  'cn': 'CHN',
  'CN': 'CHN',
  'jp': 'JPN',
  'JP': 'JPN',
};

// Country names for display
const countryNames: Record<string, string> = {
  'USA': 'United States',
  'EUR': 'Eurozone',
  'DEU': 'Germany',
  'FRA': 'France',
  'ESP': 'Spain',
  'GBR': 'United Kingdom',
  'CHN': 'China',
  'JPN': 'Japan',
};

// Single-flight map to prevent duplicate fetches
const activeFetches = new Map<string, Promise<InsertCachedEvent[]>>();

// API Response structure (from Finnworlds documentation)
interface FinnworldsResponse {
  status: {
    code: number;
    message: string;
    details: string;
  };
  result: {
    output: FinnworldsEvent[];
  };
}

// Event structure from API
interface FinnworldsEvent {
  datetime: string;           // "2025-11-11 11:00:00"
  iso_country_code: string;   // "US", "GB", "DE"
  country: string;            // "United States"
  report_name: string;        // "NFIB Business Optimism Index"
  report_date: string;        // "10"
  actual: string | null;      // "98.2"
  previous: string | null;    // "98.8"
  consensus: string | null;   // "98.3"
  unit: string;               // "points"
  impact: string;             // "1" (low), "2" (medium), "3" (high)
}

/**
 * Fetch events from Finnworlds API for a specific date and country (ISO-3 code)
 * @param date - Date in YYYY-MM-DD format
 * @param countryIso3 - Country code in ISO-3 format (USA, EUR, DEU, etc.)
 */
async function fetchEventsFromAPI(
  date: string,
  countryIso3: string
): Promise<InsertCachedEvent[]> {
  const key = `${date}-${countryIso3}`;
  
  // Check if fetch is already in progress
  if (activeFetches.has(key)) {
    console.log(`Waiting for active fetch: ${key}`);
    return activeFetches.get(key)!;
  }

  const fetchPromise = (async (): Promise<InsertCachedEvent[]> => {
    try {
      // Convert ISO-3 to ISO-2 for API request
      const countryIso2 = iso3ToIso2[countryIso3];
      if (!countryIso2) {
        console.error(`Unknown country code: ${countryIso3}`);
        return [];
      }

      const apiUrl = new URL(`${FINNWORLDS_BASE_URL}/macrocalendar`);
      apiUrl.searchParams.set("key", FINNWORLDS_API_KEY);
      apiUrl.searchParams.set("date", date);
      apiUrl.searchParams.set("iso_country_code", countryIso2);

      console.log(`Fetching from API: ${date} ${countryIso3} (${countryIso2})`);
      
      const response = await fetch(apiUrl.toString());
      
      if (response.status === 401 || response.status === 403) {
        console.error(`API auth failed for ${countryIso3} on ${date}: ${response.status}`);
        return [];
      }

      if (!response.ok) {
        console.log(`No data for ${countryIso3} on ${date}: status ${response.status}`);
        return [];
      }

      const data = await response.json();

      // Validate response structure
      if (!data || typeof data !== 'object') {
        console.log(`Invalid response for ${countryIso3} on ${date}: not an object`);
        return [];
      }

      // Check API status code if present
      if (data.status && data.status.code !== 200) {
        console.log(`API returned status ${data.status.code} for ${countryIso3} on ${date}: ${data.status.message || 'Unknown error'}`);
        return [];
      }

      // Extract events from response (handle different formats)
      const events = data.result?.output || [];
      
      if (!Array.isArray(events)) {
        console.log(`Invalid events array for ${countryIso3} on ${date} - got type: ${typeof events}`);
        console.log(`Response keys: ${Object.keys(data).join(', ')}`);
        if (data.result) console.log(`Result keys: ${Object.keys(data.result).join(', ')}`);
        return [];
      }

      if (events.length > 0) {
        console.log(`Fetched ${events.length} events for ${countryIso3} on ${date}`);
      } else {
        console.log(`No events for ${countryIso3} on ${date} (API returned empty array)`);
      }

      if (events.length === 0) {
        return [];
      }

      // Normalize events to our schema
      return events.map((event) => {
        const [eventDate, eventTime = "00:00:00"] = event.datetime.split(' ');

        // Map impact: API uses "3" for high, "2" for medium, "1" for low
        const impactValue = String(event.impact).trim();
        let impactLevel: "high" | "medium" | "low" = "low";
        if (impactValue === "3") impactLevel = "high";
        else if (impactValue === "2") impactLevel = "medium";
        else if (impactValue === "1") impactLevel = "low";

        // Translate event name to Spanish
        const eventNameEnglish = event.report_name;
        const eventNameSpanish = translateEventName(eventNameEnglish);

        // Normalize country code from API response
        const countryCode = iso2ToIso3[event.iso_country_code.toUpperCase()] || countryIso3;
        const countryName = countryNames[countryCode] || event.country;

        // Create UTC timestamp
        const eventTimestamp = parseISO(`${eventDate}T${eventTime}Z`);

        // Generate deterministic ID using hash of key fields
        const eventId = createHash('sha256')
          .update(`${eventDate}-${eventTime}-${countryCode}-${eventNameEnglish}`)
          .digest('hex')
          .substring(0, 32);

        return {
          id: eventId,
          eventTimestamp,
          date: eventDate,
          time: eventTime,
          country: countryCode,
          countryName,
          event: eventNameSpanish,
          eventOriginal: eventNameEnglish, // Keep English for categorization
          impact: impactLevel,
          actual: event.actual,
          forecast: event.consensus,
          previous: event.previous,
        };
      });
    } catch (error) {
      console.error(`Error fetching ${key}:`, error);
      return [];
    } finally {
      // Add delay to respect rate limit
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }
  })();

  activeFetches.set(key, fetchPromise);
  
  try {
    const result = await fetchPromise;
    return result;
  } finally {
    activeFetches.delete(key);
  }
}

/**
 * Fetch and cache events for a date range and countries
 */
export async function refreshEventsCache(
  fromDate: string,
  toDate: string,
  countries: string[] = Object.keys(iso3ToIso2) // Default to all supported countries
): Promise<{ fetched: number; cached: number }> {
  console.log(`Refreshing cache: ${fromDate} to ${toDate}, countries: ${countries.join(', ')}`);

  // Generate all dates in range
  const dates: string[] = [];
  const start = parseISO(fromDate);
  const end = parseISO(toDate);
  let currentDate = start;

  while (currentDate <= end) {
    dates.push(format(currentDate, "yyyy-MM-dd"));
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Fetch and save events day by day for better incremental updates
  let totalFetched = 0;
  
  for (const date of dates) {
    const dayEvents: InsertCachedEvent[] = [];
    
    for (const countryIso3 of countries) {
      const events = await fetchEventsFromAPI(date, countryIso3);
      dayEvents.push(...events);
    }
    
    // Save events for this day immediately
    if (dayEvents.length > 0) {
      await storage.saveCachedEvents(dayEvents);
      totalFetched += dayEvents.length;
    }
  }

  console.log(`Refresh complete: fetched ${totalFetched} events`);
  
  return {
    fetched: totalFetched,
    cached: totalFetched,
  };
}

/**
 * Ensure events are cached for a specific range
 * Returns true if cache is fresh, false if refresh is needed
 */
export async function ensureCacheCoverage(
  fromDate: string,
  toDate: string,
  countries?: string[]
): Promise<boolean> {
  const events = await storage.getCachedEvents({
    fromDate,
    toDate,
    countries,
  });

  // If no events, need refresh
  if (events.length === 0) {
    console.log(`No cached events for ${fromDate} to ${toDate}, needs refresh`);
    return false;
  }

  // Check if data is stale (older than 12 hours)
  const latestFetch = events.reduce((latest, event) => {
    const fetchedAt = new Date(event.fetchedAt);
    return fetchedAt > latest ? fetchedAt : latest;
  }, new Date(0));

  const age = Date.now() - latestFetch.getTime();
  const isStale = age > 12 * 60 * 60 * 1000; // 12 hours

  if (isStale) {
    console.log(`Cached events are stale (${Math.round(age / 1000 / 60)} minutes old), needs refresh`);
    return false;
  }

  return true;
}
