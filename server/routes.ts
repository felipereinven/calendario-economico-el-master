import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWatchlistCountrySchema, insertWatchlistEventSchema } from "@shared/schema";
import { calculateDateRange } from "./utils/date-range";
import { categorizeEvent } from "./utils/event-taxonomy";
import { getInvestingEvents, clearInvestingCache, isValidTimeRange, type TimeRange } from "./services/investing-scraper";
import { toZonedTime, format } from "date-fns-tz";


export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for Railway/deployment monitoring
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Investing.com scraper endpoint with time ranges
  app.get("/api/investing/:timeRange", async (req, res) => {
    try {
      const timeRange = req.params.timeRange;
      
      if (!isValidTimeRange(timeRange)) {
        return res.status(400).json({
          success: false,
          error: "Rango inválido. Usa: yesterday, today, tomorrow, thisWeek, nextWeek",
        });
      }

      console.log(`🧪 Obteniendo eventos de Investing.com (${timeRange})...`);
      const events = await getInvestingEvents(timeRange as TimeRange);
      
      // Agrupar por país
      const byCountry = events.reduce((acc, e) => {
        acc[e.country] = (acc[e.country] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Agrupar por impacto
      const byImpact = events.reduce((acc, e) => {
        acc[e.impact] = (acc[e.impact] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        success: true,
        timeRange,
        count: events.length,
        source: "Investing.com (scraping)",
        stats: {
          byCountry,
          byImpact,
        },
        events,
      });
    } catch (error) {
      console.error("Error en investing scraper:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  });

  // TEST: Investing.com scraper endpoint (mantiene compatibilidad)
  app.get("/api/test-scraper", async (req, res) => {
    try {
      console.log("🧪 Probando scraper de Investing.com...");
      const events = await getInvestingEvents("today");
      
      res.json({
        success: true,
        count: events.length,
        source: "Investing.com (scraping)",
        events: events.slice(0, 10), // Solo primeros 10 para no saturar
        cached: true,
      });
    } catch (error) {
      console.error("Error en test-scraper:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  });

  // Clear scraper cache
  app.post("/api/clear-scraper-cache", async (req, res) => {
    const { timeRange } = req.body;
    
    // Limpiar caché en memoria
    if (timeRange && isValidTimeRange(timeRange)) {
      clearInvestingCache(timeRange as TimeRange);
    } else {
      clearInvestingCache();
    }
    
    // Limpiar base de datos
    try {
      await storage.clearCachedEvents();
      res.json({ success: true, message: "Caché y base de datos limpiados" });
    } catch (error) {
      console.error("Error limpiando base de datos:", error);
      res.json({ success: true, message: "Caché de memoria limpiado (error en DB)" });
    }
  });

  // Economic events endpoint - Now serves from Investing.com scraping + database
  app.get("/api/events", async (req, res) => {
    try {
      const { countries, impacts, categories, dateRange, search, timezone, from, to } = req.query;

      // Calculate date range considering timezone
      let range;
      const tz = (timezone as string) || "UTC";

      if (from && to) {
        // If explicit dates are provided (from frontend calculation), use them
        // We assume 'from' and 'to' are ISO strings in UTC
        range = {
          startUtc: new Date(from as string),
          endUtc: new Date(to as string),
          // For logging/debugging purposes
          startDate: format(toZonedTime(new Date(from as string), tz), "yyyy-MM-dd"),
          endDate: format(toZonedTime(new Date(to as string), tz), "yyyy-MM-dd")
        };
        console.log(`[/api/events] Using explicit range: ${from} to ${to}`);
      } else {
        // Fallback to legacy calculation
        const period = (dateRange as "yesterday" | "today" | "tomorrow" | "thisWeek" | "nextWeek" | "thisMonth") || "today";
        range = calculateDateRange(period, tz);
        console.log(`[/api/events] Period: ${period}, Timezone: ${tz}, Date range: ${range.startDate} to ${range.endDate}`);
      }

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

      // Query database cache using UTC timestamps
      // We add a small buffer if using calculated ranges, but trust explicit ranges
      const startUtc = range.startUtc;
      const endUtc = range.endUtc;
      
      let events = await storage.getCachedEvents({
        startUtc,
        endUtc,
        countries: selectedCountries,
        impacts: selectedImpacts,
      });

      console.log(`[/api/events] Found ${events.length} events in database`);

      // Smart hybrid fallback: handle empty cache scenarios
      if (events.length === 0) {
        const latestCacheDate = await storage.getLatestCachedDate();
        
        // Case 1: Cache is completely empty (first startup)
        if (!latestCacheDate) {
          console.log(`Cache empty - bootstrapping with Investing.com scraper`);
          try {
            // Usar scraper para inicializar
            await getInvestingEvents("yesterday");
            await getInvestingEvents("today");
            await getInvestingEvents("tomorrow");
            
            // Re-query after bootstrap
            events = await storage.getCachedEvents({
              startUtc,
              endUtc,
              countries: selectedCountries,
              impacts: selectedImpacts,
            });
            console.log(`Bootstrap successful: ${events.length} events`);
          } catch (error) {
            console.error("Bootstrap refresh failed:", error);
            return res.status(503).json({ 
              error: "El caché se está inicializando. Por favor, intenta de nuevo en unos segundos.",
              details: "Cache warming up - fetching data from Investing.com"
            });
          }
        }
        // Case 2: Cache exists but this date range has no data (normal scenario)
        // Fall through and return empty array
      }

      // Filter events by timezone-adjusted dates ONLY if we didn't use explicit range
      // If we used explicit range (from/to), the DB query is already precise enough
      let timezoneSafeEvents = events;
      
      if (!from || !to) {
        timezoneSafeEvents = events.filter((event) => {
          const eventInUserTz = toZonedTime(new Date(event.eventTimestamp), tz);
          const eventDateStr = format(eventInUserTz, "yyyy-MM-dd");
          return eventDateStr >= range.startDate && eventDateStr <= range.endDate;
        });
        console.log(`[/api/events] After timezone adjustment: ${timezoneSafeEvents.length} events match ${range.startDate} to ${range.endDate} in ${tz}`);
      }

      // Apply category filter in memory
      let filteredEvents = timezoneSafeEvents;
      if (categories && typeof categories === "string" && categories.trim()) {
        const selectedCategories = categories.split(',').map(c => c.trim());
        filteredEvents = filteredEvents.filter((event) => {
          // Use the category field if available, otherwise categorize on the fly
          if (event.category) {
            return selectedCategories.includes(event.category);
          }
          const eventCategories = categorizeEvent(event.event);
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
        const categorizedCount = filteredEvents.filter(e => e.category).length;
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
