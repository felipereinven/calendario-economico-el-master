import type { Express } from "express";
import { createServer, type Server } from "http";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, parseISO, format } from "date-fns";
import { storage } from "./storage";
import { insertWatchlistCountrySchema, insertWatchlistEventSchema } from "@shared/schema";

const FINNWORLDS_API_KEY = process.env.FINNWORLDS_API_KEY;
const FINNWORLDS_BASE_URL = "https://api.finnworlds.com/api/v1";

interface FinnworldsEvent {
  id?: string;
  date: string;
  time: string;
  country: string;
  country_name?: string;
  event: string;
  impact: "high" | "medium" | "low";
  actual?: string | null;
  forecast?: string | null;
  previous?: string | null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Economic events endpoint
  app.get("/api/events", async (req, res) => {
    try {
      const { countries, impacts, dateRange, search } = req.query;

      // Validate API key presence
      if (!FINNWORLDS_API_KEY) {
        console.warn("FINNWORLDS_API_KEY not configured, using fallback data");
        const fallbackData = getFallbackEvents();
        return res.json(applyClientFilters(fallbackData, { countries, impacts, search }));
      }

      // Calculate date range for API request
      let fromDate: string;
      let toDate: string;
      const now = new Date();

      if (dateRange && typeof dateRange === "string") {
        switch (dateRange) {
          case "today":
            fromDate = format(startOfDay(now), "yyyy-MM-dd");
            toDate = format(endOfDay(now), "yyyy-MM-dd");
            break;
          case "thisWeek":
            fromDate = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
            toDate = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
            break;
          case "nextWeek":
            const nextWeekStart = addWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1);
            fromDate = format(nextWeekStart, "yyyy-MM-dd");
            toDate = format(endOfWeek(nextWeekStart, { weekStartsOn: 1 }), "yyyy-MM-dd");
            break;
          case "thisMonth":
            fromDate = format(startOfMonth(now), "yyyy-MM-dd");
            toDate = format(endOfMonth(now), "yyyy-MM-dd");
            break;
          default:
            fromDate = format(startOfDay(now), "yyyy-MM-dd");
            toDate = format(endOfDay(now), "yyyy-MM-dd");
        }
      } else {
        fromDate = format(startOfDay(now), "yyyy-MM-dd");
        toDate = format(endOfDay(now), "yyyy-MM-dd");
      }

      // Build Finnworlds API URL
      const apiUrl = new URL(`${FINNWORLDS_BASE_URL}/economiccalendar`);
      apiUrl.searchParams.set("key", FINNWORLDS_API_KEY);
      apiUrl.searchParams.set("from", fromDate);
      apiUrl.searchParams.set("to", toDate);

      // Add country filter if specified (API may support comma-separated values)
      if (countries && typeof countries === "string" && countries.trim()) {
        apiUrl.searchParams.set("country", countries);
      }

      // Add impact filter if specified (API may support comma-separated values)
      if (impacts && typeof impacts === "string" && impacts.trim()) {
        apiUrl.searchParams.set("impact", impacts);
      }

      // Fetch data from Finnworlds API
      let events: FinnworldsEvent[] = [];
      
      try {
        const response = await fetch(apiUrl.toString());
        
        if (response.status === 401 || response.status === 403) {
          console.error(`Finnworlds API authentication error: ${response.status}`);
          const fallbackData = getFallbackEvents();
          return res.json(applyClientFilters(fallbackData, { countries, impacts, search }));
        }
        
        if (!response.ok) {
          console.error(`Finnworlds API error: ${response.status} ${response.statusText}`);
          const fallbackData = getFallbackEvents();
          return res.json(applyClientFilters(fallbackData, { countries, impacts, search }));
        }
        
        const data = await response.json();
        events = Array.isArray(data) ? data : (data.events || []);
      } catch (apiError) {
        console.error("Error fetching from Finnworlds API:", apiError);
        const fallbackData = getFallbackEvents();
        return res.json(applyClientFilters(fallbackData, { countries, impacts, search }));
      }

      // Normalize the response format with defensive time parsing
      let normalizedEvents = events.map((event, index) => {
        // Ensure time is in HH:MM:SS format
        let eventTime = event.time || "00:00:00";
        if (eventTime && !eventTime.includes(":")) {
          eventTime = "00:00:00"; // Invalid time format, use default
        }
        
        return {
          id: event.id || `event-${index}`,
          date: event.date,
          time: eventTime,
          country: event.country,
          countryName: event.country_name || event.country,
          event: event.event,
          impact: event.impact || "low",
          actual: event.actual || null,
          forecast: event.forecast || null,
          previous: event.previous || null,
        };
      });

      // Apply search filter if specified
      if (search && typeof search === "string" && search.trim()) {
        const searchLower = search.toLowerCase();
        normalizedEvents = normalizedEvents.filter(
          (event) =>
            event.event.toLowerCase().includes(searchLower) ||
            event.country.toLowerCase().includes(searchLower) ||
            event.countryName.toLowerCase().includes(searchLower)
        );
      }

      res.json(normalizedEvents);
    } catch (error) {
      console.error("Error in /api/events:", error);
      res.status(500).json({ error: "Failed to fetch economic events" });
    }
  });

  // Watchlist Countries API
  app.get("/api/watchlist/countries", async (req, res) => {
    try {
      const sessionId = req.headers['x-session-id'] as string || 'default';
      const countries = await storage.getWatchlistCountries(sessionId);
      res.json(countries);
    } catch (error) {
      console.error("Error fetching watchlist countries:", error);
      res.status(500).json({ error: "Failed to fetch watchlist countries" });
    }
  });

  app.post("/api/watchlist/countries", async (req, res) => {
    try {
      const sessionId = req.headers['x-session-id'] as string || 'default';
      const validated = insertWatchlistCountrySchema.parse({ ...req.body, sessionId });
      const country = await storage.addWatchlistCountry(validated);
      res.json(country);
    } catch (error) {
      console.error("Error adding watchlist country:", error);
      res.status(500).json({ error: "Failed to add watchlist country" });
    }
  });

  app.delete("/api/watchlist/countries/:countryCode", async (req, res) => {
    try {
      const sessionId = req.headers['x-session-id'] as string || 'default';
      const { countryCode } = req.params;
      await storage.removeWatchlistCountry(sessionId, countryCode);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing watchlist country:", error);
      res.status(500).json({ error: "Failed to remove watchlist country" });
    }
  });

  // Watchlist Events API
  app.get("/api/watchlist/events", async (req, res) => {
    try {
      const sessionId = req.headers['x-session-id'] as string || 'default';
      const events = await storage.getWatchlistEvents(sessionId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching watchlist events:", error);
      res.status(500).json({ error: "Failed to fetch watchlist events" });
    }
  });

  app.post("/api/watchlist/events", async (req, res) => {
    try {
      const sessionId = req.headers['x-session-id'] as string || 'default';
      const validated = insertWatchlistEventSchema.parse({ ...req.body, sessionId });
      const event = await storage.addWatchlistEvent(validated);
      res.json(event);
    } catch (error) {
      console.error("Error adding watchlist event:", error);
      res.status(500).json({ error: "Failed to add watchlist event" });
    }
  });

  app.delete("/api/watchlist/events/:eventId", async (req, res) => {
    try {
      const sessionId = req.headers['x-session-id'] as string || 'default';
      const { eventId } = req.params;
      await storage.removeWatchlistEvent(sessionId, eventId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing watchlist event:", error);
      res.status(500).json({ error: "Failed to remove watchlist event" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

// Apply client-side filters to fallback data
function applyClientFilters(
  events: FinnworldsEvent[],
  filters: { countries?: unknown; impacts?: unknown; search?: unknown }
): FinnworldsEvent[] {
  let filtered = [...events];

  // Filter by countries
  if (filters.countries && typeof filters.countries === "string") {
    const countryList = filters.countries.split(",").map(c => c.trim());
    if (countryList.length > 0) {
      filtered = filtered.filter((event) => countryList.includes(event.country));
    }
  }

  // Filter by impacts
  if (filters.impacts && typeof filters.impacts === "string") {
    const impactList = filters.impacts.split(",").map(i => i.trim());
    if (impactList.length > 0) {
      filtered = filtered.filter((event) => impactList.includes(event.impact));
    }
  }

  // Filter by search term
  if (filters.search && typeof filters.search === "string" && filters.search.trim()) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (event) =>
        event.event.toLowerCase().includes(searchLower) ||
        event.country.toLowerCase().includes(searchLower) ||
        (event.country_name && event.country_name.toLowerCase().includes(searchLower))
    );
  }

  return filtered;
}

// Fallback sample data when API is unavailable
function getFallbackEvents(): FinnworldsEvent[] {
  const today = format(new Date(), "yyyy-MM-dd");
  
  return [
    {
      id: "1",
      date: today,
      time: "08:30:00",
      country: "USD",
      country_name: "United States",
      event: "Core Retail Sales m/m",
      impact: "high" as const,
      actual: "0.5%",
      forecast: "0.3%",
      previous: "0.2%",
    },
    {
      id: "2",
      date: today,
      time: "10:00:00",
      country: "EUR",
      country_name: "Eurozone",
      event: "Consumer Price Index y/y",
      impact: "high" as const,
      actual: null,
      forecast: "2.4%",
      previous: "2.2%",
    },
    {
      id: "3",
      date: today,
      time: "12:30:00",
      country: "GBP",
      country_name: "United Kingdom",
      event: "GDP m/m",
      impact: "medium" as const,
      actual: "0.2%",
      forecast: "0.1%",
      previous: "0.0%",
    },
    {
      id: "4",
      date: today,
      time: "14:00:00",
      country: "JPY",
      country_name: "Japan",
      event: "Industrial Production m/m",
      impact: "low" as const,
      actual: null,
      forecast: "0.5%",
      previous: "0.3%",
    },
    {
      id: "5",
      date: today,
      time: "08:30:00",
      country: "USD",
      country_name: "United States",
      event: "Unemployment Claims",
      impact: "medium" as const,
      actual: null,
      forecast: "230K",
      previous: "228K",
    },
    {
      id: "6",
      date: today,
      time: "09:00:00",
      country: "CNY",
      country_name: "China",
      event: "GDP Growth Rate q/q",
      impact: "high" as const,
      actual: null,
      forecast: "4.9%",
      previous: "4.7%",
    },
  ];
}
