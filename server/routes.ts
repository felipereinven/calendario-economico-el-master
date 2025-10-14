import type { Express } from "express";
import { createServer, type Server } from "http";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, parseISO, format } from "date-fns";
import { storage } from "./storage";
import { insertWatchlistCountrySchema, insertWatchlistEventSchema } from "@shared/schema";

const FINNWORLDS_API_KEY = process.env.FINNWORLDS_API_KEY;
const FINNWORLDS_BASE_URL = "https://api.finnworlds.com/api/v1";

// Diccionario de traducciones de términos económicos
const economicTranslations: Record<string, string> = {
  // Indicadores económicos generales
  "GDP": "PIB",
  "Gross Domestic Product": "Producto Interno Bruto",
  "CPI": "IPC",
  "Consumer Price Index": "Índice de Precios al Consumidor",
  "PPI": "IPP",
  "Producer Price Index": "Índice de Precios al Productor",
  "Unemployment Rate": "Tasa de Desempleo",
  "Jobless Claims": "Solicitudes de Desempleo",
  "Non-Farm Payrolls": "Nóminas No Agrícolas",
  "Retail Sales": "Ventas Minoristas",
  "Industrial Production": "Producción Industrial",
  "Manufacturing": "Manufactura",
  "PMI": "PMI",
  "Purchasing Managers Index": "Índice de Gerentes de Compras",
  "Trade Balance": "Balanza Comercial",
  "Current Account": "Cuenta Corriente",
  "Budget": "Presupuesto",
  "Deficit": "Déficit",
  "Surplus": "Superávit",
  
  // Bancos centrales y tasas
  "Interest Rate": "Tasa de Interés",
  "Fed": "Fed",
  "Federal Reserve": "Reserva Federal",
  "ECB": "BCE",
  "European Central Bank": "Banco Central Europeo",
  "BoC": "BdC",
  "Bank of Canada": "Banco de Canada",
  "BoE": "BdI",
  "Bank of England": "Banco de Inglaterra",
  "BoJ": "BdJ",
  "Bank of Japan": "Banco de Japón",
  "FOMC": "FOMC",
  "Monetary Policy": "Política Monetaria",
  "Rate Decision": "Decisión de Tasas",
  "Meeting Minutes": "Actas de Reunión",
  "Speech": "Discurso",
  "Press Conference": "Conferencia de Prensa",
  
  // Vivienda y construcción
  "Building Permits": "Permisos de Construcción",
  "Housing Starts": "Inicio de Viviendas",
  "Home Sales": "Ventas de Viviendas",
  "Existing Home Sales": "Ventas de Viviendas Existentes",
  "New Home Sales": "Ventas de Viviendas Nuevas",
  "Housing Price Index": "Índice de Precios de Vivienda",
  "Mortgage": "Hipoteca",
  
  // Confianza y sentimiento
  "Consumer Confidence": "Confianza del Consumidor",
  "Business Confidence": "Confianza Empresarial",
  "Sentiment": "Sentimiento",
  "Survey": "Encuesta",
  
  // Otros términos comunes
  "Preliminary": "Preliminar",
  "Final": "Final",
  "Revised": "Revisado",
  "Flash": "Flash",
  "YoY": "Anual",
  "MoM": "Mensual",
  "QoQ": "Trimestral",
  "Annual": "Anual",
  "Monthly": "Mensual",
  "Quarterly": "Trimestral",
  "Change": "Cambio",
  "Growth": "Crecimiento",
  "Index": "Índice",
  "Report": "Reporte",
  "Data": "Datos",
  "Forecast": "Pronóstico",
  "Actual": "Real",
  "Previous": "Anterior",
  "Core": "Subyacente",
  "Inflation": "Inflación",
  "Exports": "Exportaciones",
  "Imports": "Importaciones",
  "Sales": "Ventas",
  "Orders": "Pedidos",
  "Inventories": "Inventarios",
  "Production": "Producción",
  "Capacity Utilization": "Utilización de Capacidad",
};

// Función para traducir nombres de eventos
function translateEventName(eventName: string): string {
  let translated = eventName;
  
  // Reemplazar términos conocidos (ordenar por longitud descendente para evitar reemplazos parciales)
  const sortedKeys = Object.keys(economicTranslations).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    const regex = new RegExp(key, 'gi');
    translated = translated.replace(regex, economicTranslations[key]);
  }
  
  return translated;
}

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
        console.error("FINNWORLDS_API_KEY not configured");
        return res.status(500).json({ 
          error: "API key not configured",
          message: "Error al cargar los datos económicos desde Finnworlds API. Verifica la conexión. Los datos pueden no estar actualizados."
        });
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

      // Finnworlds API solo acepta UNA fecha específica, no rangos
      // Country es OBLIGATORIO en la API
      const apiUrl = new URL(`${FINNWORLDS_BASE_URL}/macrocalendar`);
      apiUrl.searchParams.set("key", FINNWORLDS_API_KEY);
      apiUrl.searchParams.set("date", fromDate);
      
      // Mapeo de códigos ISO a nombres de país que Finnworlds acepta
      const countryCodeToName: Record<string, string> = {
        'USA': 'United_States',
        'GBR': 'United_Kingdom',
        'CAD': 'Canada',
        'DEU': 'Germany',
        'FRA': 'France',
        'JPN': 'Japan',
        'CHN': 'China',
        'IND': 'India',
        'BRA': 'Brazil',
      };
      
      // Country es requerido - usar el primero seleccionado o US por defecto
      let targetCountry = "United_States";
      if (countries && typeof countries === "string" && countries.trim()) {
        const countryCode = countries.split(',')[0].trim();
        targetCountry = countryCodeToName[countryCode] || countryCode.replace(/ /g, '_');
      }
      apiUrl.searchParams.set("country", targetCountry);

      // Fetch data from Finnworlds API
      let events: FinnworldsEvent[] = [];
      
      try {
        const response = await fetch(apiUrl.toString());
        const responseText = await response.text();
        
        if (response.status === 401 || response.status === 403) {
          return res.status(500).json({ 
            error: "API authentication failed",
            message: "Error al cargar los datos económicos desde Finnworlds API. Verifica la API key."
          });
        }
        
        if (!response.ok) {
          return res.status(500).json({ 
            error: "API request failed",
            message: "Error al cargar los datos económicos desde Finnworlds API. Verifica la conexión."
          });
        }
        
        // Parsear respuesta
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          return res.status(500).json({ 
            error: "API returned invalid JSON",
            message: "La API de Finnworlds devolvió una respuesta inválida."
          });
        }
        
        // Finnworlds devuelve HTTP 200 con code:404 cuando no hay datos
        if (data.code === 404 || data.code === "404") {
          events = [];
        }
        // Finnworlds devuelve: { status: {...}, result: { output: [...] } }
        else if (data.result && data.result.output && Array.isArray(data.result.output)) {
          events = data.result.output;
        } else if (data.result && Array.isArray(data.result)) {
          events = data.result;
        } else if (Array.isArray(data)) {
          events = data;
        } else {
          events = [];
        }
      } catch (apiError) {
        return res.status(500).json({ 
          error: "API connection failed",
          message: "Error al cargar los datos económicos desde Finnworlds API. Verifica la conexión."
        });
      }

      // Normalize the response format with defensive time parsing
      let normalizedEvents = events.map((event: any, index) => {
        // Finnworlds devuelve datetime como "2025-10-14 10:00:00"
        const datetime = event.datetime || "";
        const [eventDate, eventTime] = datetime.split(' ');
        
        // Mapear impact numérico a string: "1"->high, "2"->medium, "3"->low
        let impactLevel = "low";
        if (event.impact === "1") impactLevel = "high";
        else if (event.impact === "2") impactLevel = "medium";
        else if (event.impact === "3") impactLevel = "low";
        
        // Traducir nombre del evento al español
        const eventNameEnglish = event.report_name || event.event || "Economic Event";
        const eventNameSpanish = translateEventName(eventNameEnglish);
        
        return {
          id: event.id || `event-${index}`,
          date: eventDate || format(new Date(), "yyyy-MM-dd"),
          time: eventTime || "00:00:00",
          country: event.iso_country_code || event.country || "US",
          countryName: event.country || event.country_name || "Unknown",
          event: eventNameSpanish,
          impact: impactLevel,
          actual: event.actual || null,
          forecast: event.consensus || event.forecast || null,
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
