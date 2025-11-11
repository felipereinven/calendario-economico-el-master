import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWatchlistCountrySchema, insertWatchlistEventSchema } from "@shared/schema";
import { calculateDateRange } from "./utils/date-range";
import { categorizeEvent } from "./utils/event-taxonomy";
import { refreshEventsCache } from "./services/events-cache";

const FINNWORLDS_API_KEY = process.env.FINNWORLDS_API_KEY;


export async function registerRoutes(app: Express): Promise<Server> {
  // Economic events endpoint
  // Economic events endpoint - Now serves from database cache
  app.get("/api/events", async (req, res) => {
    try {
      const { countries, impacts, categories, dateRange, search, timezone } = req.query;

      // Calculate date range considering timezone
      const period = (dateRange as "today" | "thisWeek" | "nextWeek" | "thisMonth") || "today";
      const tz = (timezone as string) || "UTC";
      const range = calculateDateRange(period, tz);

      // Parse countries filter
      let selectedCountries: string[] | undefined;
      if (countries && typeof countries === "string" && countries.trim()) {
        selectedCountries = countries.split(',').map(c => c.trim());
      }

      // Parse impacts filter  
      let selectedImpacts: string[] | undefined;
      if (impacts && typeof impacts === "string" && impacts.trim()) {
        selectedImpacts = impacts.split(',').map(i => i.trim());
      }

      // Query database cache using UTC timestamps for timezone accuracy
      let events = await storage.getCachedEvents({
        startUtc: range.startUtc,
        endUtc: range.endUtc,
        countries: selectedCountries,
        impacts: selectedImpacts,
      });

      // Smart hybrid fallback: handle empty cache scenarios
      if (events.length === 0) {
        const latestCacheDate = await storage.getLatestCachedDate();
        
        // Case 1: Cache is completely empty (first startup)
        if (!latestCacheDate) {
          if (FINNWORLDS_API_KEY) {
            console.log(`Cache empty - bootstrapping with on-demand fetch for ${range.startDate} to ${range.endDate}`);
            try {
              await refreshEventsCache(range.startDate, range.endDate);
              // Re-query after bootstrap
              events = await storage.getCachedEvents({
                startUtc: range.startUtc,
                endUtc: range.endUtc,
                countries: selectedCountries,
                impacts: selectedImpacts,
              });
              console.log(`Bootstrap successful: fetched ${events.length} events`);
            } catch (error) {
              console.error("Bootstrap refresh failed:", error);
              return res.status(503).json({ 
                error: "El caché se está inicializando. Por favor, intenta de nuevo en unos segundos.",
                details: "Cache warming up - background jobs are fetching initial data"
              });
            }
          } else {
            console.error("Cache empty and FINNWORLDS_API_KEY not configured");
            return res.status(503).json({ 
              error: "API no configurada correctamente. Contacta al administrador.",
              details: "FINNWORLDS_API_KEY environment variable is not set"
            });
          }
        }
        // Case 2: Cache exists but this date range has no data (normal scenario)
        // Fall through and return empty array
      }

      // Apply category filter in memory (use English original name)
      let filteredEvents = events;
      if (categories && typeof categories === "string" && categories.trim()) {
        const selectedCategories = categories.split(',').map(c => c.trim());
        filteredEvents = filteredEvents.filter((event) => {
          const eventCategories = categorizeEvent(event.eventOriginal);
          return selectedCategories.some(cat => eventCategories.includes(cat));
        });
      }

      // Apply search filter in memory
      if (search && typeof search === "string" && search.trim()) {
        const searchLower = search.toLowerCase();
        filteredEvents = filteredEvents.filter(
          (event) =>
            event.event.toLowerCase().includes(searchLower) ||
            event.country.toLowerCase().includes(searchLower) ||
            event.countryName.toLowerCase().includes(searchLower)
        );
      }

      // Log category coverage for monitoring
      if (filteredEvents.length > 0) {
        const categorizedCount = filteredEvents.filter(e => categorizeEvent(e.eventOriginal).length > 0).length;
        console.log(`Category coverage: ${categorizedCount}/${filteredEvents.length} events (${Math.round(categorizedCount / Math.max(filteredEvents.length, 1) * 100)}%)`);
      }

      // Return events (cache-first architecture)
      res.json(filteredEvents);
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
