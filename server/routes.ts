import type { Express } from "express";
import { createServer, type Server } from "http";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, parseISO, format } from "date-fns";
import { storage } from "./storage";
import { insertWatchlistCountrySchema, insertWatchlistEventSchema } from "@shared/schema";

const FINNWORLDS_API_KEY = process.env.FINNWORLDS_API_KEY;
const FINNWORLDS_BASE_URL = "https://api.finnworlds.com/api/v1";

// Caché en memoria para datos de Finnworlds (5 minutos de vida)
const apiCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Global lock para prevenir peticiones concurrentes que excedan rate limit
const fetchLocks = new Map<string, Promise<any[]>>();

// Global queue para rate limiting de TODAS las peticiones a Finnworlds
class GlobalRateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private readonly delayMs = 3000; // 3 segundos entre peticiones = max 20/min

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
      
      // Delay antes de la siguiente petición
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delayMs));
      }
    }
    this.processing = false;
  }
}

const globalRateLimiter = new GlobalRateLimiter();

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
  
  // Palabras adicionales comunes
  "Statement": "Declaración",
  "Announcement": "Anuncio",
  "Release": "Publicación",
  "Economic": "Económico",
  "Outlook": "Perspectiva",
  "Review": "Revisión",
  "Update": "Actualización",
  "Estimate": "Estimación",
  "Expectations": "Expectativas",
  "Projection": "Proyección",
  "Indicator": "Indicador",
  "Rate": "Tasa",
  "Level": "Nivel",
  "Value": "Valor",
  "Total": "Total",
  "Net": "Neto",
  "Gross": "Bruto",
  "Private": "Privado",
  "Public": "Público",
  "Government": "Gubernamental",
  "Sector": "Sector",
  "Activity": "Actividad",
  "Performance": "Desempeño",
  "Outlook": "Perspectiva",
  "Composite": "Compuesto",
  "Leading": "Adelantado",
  "Lagging": "Rezagado",
  "Coincident": "Coincidente",
  "Week": "Semana",
  "Month": "Mes",
  "Quarter": "Trimestre",
  "Year": "Año",
  "Period": "Período",
  "Day": "Día",
  "Hour": "Hora",
  "Minute": "Minuto",
  "Mo": "M",
  "Yr": "A",
  "Qtr": "T",
  "Wk": "Sem",
  "Continues": "Continúa",
  "Remains": "Permanece",
  "Rises": "Sube",
  "Falls": "Baja",
  "Increases": "Aumenta",
  "Decreases": "Disminuye",
  "Stable": "Estable",
  "Volatile": "Volátil",
  "Strong": "Fuerte",
  "Weak": "Débil",
  "High": "Alto",
  "Low": "Bajo",
  "Better": "Mejor",
  "Worse": "Peor",
  "Above": "Por encima",
  "Below": "Por debajo",
  "Expected": "Esperado",
  "Unexpected": "Inesperado",
  "Bonus": "Bonificación",
  "Bonuses": "Bonificaciones",
  "Including": "Incluyendo",
  "Excluding": "Excluyendo",
  "incl": "incl",
  "excl": "excl",
  "ex": "ex",
  "vs": "vs",
  "w/": "c/",
  "w/o": "s/",
  
  // Términos financieros y mercados
  // Términos financieros (singular y plural)
  "Bill": "Bono",
  "Bills": "Bonos",
  "Auction": "Subasta",
  "Auctions": "Subastas",
  "Treasury": "Tesoro",
  "Treasuries": "Tesoros",
  "Bond": "Bono",
  "Bonds": "Bonos",
  "Note": "Nota",
  "Notes": "Notas",
  "Yield": "Rendimiento",
  "Yields": "Rendimientos",
  "Debt": "Deuda",
  "Debts": "Deudas",
  "Stock": "Acción",
  "Stocks": "Acciones",
  "Market": "Mercado",
  "Markets": "Mercados",
  "Business": "Empresarial",
  "Businesses": "Negocios",
  "Optimism": "Optimismo",
  "Pessimism": "Pesimismo",
  "Average": "Promedio",
  "Averages": "Promedios",
  "Earnings": "Ganancias",
  "Earning": "Ganancia",
  "Income": "Ingreso",
  "Incomes": "Ingresos",
  "Profit": "Beneficio",
  "Profits": "Beneficios",
  "Loss": "Pérdida",
  "Losses": "Pérdidas",
  "Revenue": "Ingresos",
  "Revenues": "Ingresos",
  "Cost": "Costo",
  "Costs": "Costos",
  "Price": "Precio",
  "Prices": "Precios",
  "Spending": "Gasto",
  "Investment": "Inversión",
  "Investments": "Inversiones",
  "Consumer": "Consumidor",
  "Consumers": "Consumidores",
  "Business": "Negocios",
  "Commercial": "Comercial",
  "Industrial": "Industrial",
  "Services": "Servicios",
  "Service": "Servicio",
  "Manufacturing": "Manufactura",
  "Construction": "Construcción",
  "Transportation": "Transporte",
  "Energy": "Energía",
  "Utilities": "Servicios Públicos",
  "Utility": "Servicio Público",
  "Finance": "Finanzas",
  "Banking": "Banca",
  "Credit": "Crédito",
  "Credits": "Créditos",
  "Loan": "Préstamo",
  "Loans": "Préstamos",
  "Mortgage": "Hipoteca",
  "Mortgages": "Hipotecas",
  "Deposit": "Depósito",
  "Deposits": "Depósitos",
  "Withdrawal": "Retiro",
  "Withdrawals": "Retiros",
  "Balance": "Saldo",
  "Balances": "Saldos",
  "Reserve": "Reserva",
  "Reserves": "Reservas",
  "Currency": "Moneda",
  "Currencies": "Monedas",
  "Exchange": "Cambio",
  "Exchanges": "Cambios",
  "Foreign": "Extranjero",
  "Domestic": "Doméstico",
  "International": "Internacional",
  "Global": "Global",
  "Regional": "Regional",
  "Local": "Local",
  "National": "Nacional",
  
  // Términos de empleo adicionales
  "Employment": "Empleo",
  "Payrolls": "Nóminas",
  "Payroll": "Nómina",
  "Claimant": "Solicitante",
  "Claimants": "Solicitantes",
  "Count": "Conteo",
  "Counts": "Conteos",
  "Claimant Count": "Conteo de Solicitantes",
  "HMRC": "HMRC",
  "Job": "Empleo",
  "Jobs": "Empleos",
  "Hiring": "Contratación",
  "Workers": "Trabajadores",
  "Worker": "Trabajador",
  "Employee": "Empleado",
  "Employees": "Empleados",
  "Employer": "Empleador",
  "Employers": "Empleadores",
};

// Función para traducir nombres de eventos
function translateEventName(eventName: string): string {
  let translated = eventName;
  
  // Reemplazar términos conocidos (ordenar por longitud descendente para evitar reemplazos parciales)
  const sortedKeys = Object.keys(economicTranslations).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    // Usar word boundary para reemplazos más precisos
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    translated = translated.replace(regex, economicTranslations[key]);
  }
  
  // Limpiar y formatear
  translated = translated.trim();
  
  return translated;
}

// Palabras clave para categorizar eventos
const categoryKeywords = {
  employment: ['employment', 'unemployment', 'jobless', 'payroll', 'jobs', 'labor', 'empleo', 'desempleo', 'nómina'],
  inflation: ['cpi', 'ppi', 'inflation', 'price index', 'prices', 'inflación', 'precios', 'ipc', 'ipp'],
  monetary: ['interest rate', 'fed', 'fomc', 'central bank', 'monetary policy', 'ecb', 'boc', 'boe', 'boj', 'tasa de interés', 'política monetaria', 'banco central'],
  manufacturing: ['manufacturing', 'pmi', 'industrial production', 'factory', 'manufactura', 'producción industrial', 'fábrica'],
  services: ['services', 'retail sales', 'consumer spending', 'servicios', 'ventas minoristas', 'gasto del consumidor'],
  energy: ['oil', 'energy', 'crude', 'natural gas', 'petróleo', 'energía', 'crudo', 'gas'],
  confidence: ['confidence', 'sentiment', 'survey', 'confianza', 'sentimiento', 'encuesta'],
};

// Función para determinar la categoría de un evento
function categorizeEvent(eventName: string): string[] {
  const categories: string[] = [];
  const lowerEventName = eventName.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerEventName.includes(keyword.toLowerCase()))) {
      categories.push(category);
    }
  }
  
  return categories;
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
      const { countries, impacts, categories, dateRange, search } = req.query;

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
        'EUR': 'Eurozone',
        'GBR': 'United_Kingdom',
        'DEU': 'Germany',
        'FRA': 'France',
        'ESP': 'Spain',
        'CAD': 'Canada',
        'JPN': 'Japan',
        'CHN': 'China',
        'IND': 'India',
        'BRA': 'Brazil',
      };
      
      // Determinar qué países consultar
      let targetCountries: string[] = [];
      if (countries && typeof countries === "string" && countries.trim()) {
        // Usar los países seleccionados
        targetCountries = countries.split(',').map(code => {
          const countryCode = code.trim();
          return countryCodeToName[countryCode] || countryCode.replace(/ /g, '_');
        });
      } else {
        // Si no hay países seleccionados ("Todos los países"), consultar TODOS los países disponibles
        targetCountries = Object.values(countryCodeToName);
      }

      // Generar todas las fechas del rango
      const dates: string[] = [];
      const start = parseISO(fromDate);
      const end = parseISO(toDate);
      let currentDate = start;
      
      while (currentDate <= end) {
        dates.push(format(currentDate, "yyyy-MM-dd"));
        currentDate = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Limitar días según el rango para optimizar rate limiting
      // Con límite de 20 req/min (1 cada 3 seg), 11 países × N días = tiempo de carga
      // "Hoy": 1 día × 11 países = 11 req = ~33 segundos (aceptable)
      // "Esta Semana": 3 días × 11 países = 33 req = ~99 segundos (límite razonable)
      // "Este Mes": 7 días × 11 países = 77 req = ~231 segundos (demasiado, limitar a 3 días)
      const maxDays = dateRange === 'today' ? 1 : dateRange === 'this-week' ? 3 : 3;
      const datesToFetch = dates.slice(0, maxDays);

      // Usar el global rate limiter para procesar todas las peticiones
      const processWithGlobalRateLimit = async <T,>(
        items: T[],
        processor: (item: T) => Promise<any>
      ): Promise<any[]> => {
        const results: any[] = [];
        
        for (const item of items) {
          // Cada petición pasa por el rate limiter global
          const result = await globalRateLimiter.add(() => processor(item));
          results.push(result);
        }
        
        return results;
      };

      // Fetch data from Finnworlds API (para todos los países y todas las fechas)
      let events: FinnworldsEvent[] = [];
      
      // Verificar caché primero (normalizar cache key ordenando países alfabéticamente)
      const normalizedCountries = [...targetCountries].sort();
      const cacheKey = `${JSON.stringify(normalizedCountries)}-${fromDate}-${toDate}`;
      const cached = apiCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.log(`Using cached data for ${cacheKey.substring(0, 100)}...`);
        events = cached.data;
      } else {
        // Si hay un fetch en curso para esta cache key, esperar a que termine
        if (fetchLocks.has(cacheKey)) {
          console.log(`Waiting for ongoing fetch for ${cacheKey.substring(0, 100)}...`);
          events = await fetchLocks.get(cacheKey)!;
        } else {
          // Crear el lock y proceder con el fetch
          const fetchPromise = (async () => {
      try {
        // Crear una lista de todas las combinaciones de país + fecha
        const requests = targetCountries.flatMap(country => 
          datesToFetch.map(date => ({ country, date }))
        );
        
        // Procesar peticiones con global rate limiting: todas las peticiones del servidor usan la misma cola
        const results = await processWithGlobalRateLimit(requests, async ({ country, date }) => {
          const countryApiUrl = new URL(`${FINNWORLDS_BASE_URL}/macrocalendar`);
          countryApiUrl.searchParams.set("key", FINNWORLDS_API_KEY);
          countryApiUrl.searchParams.set("date", date);
          countryApiUrl.searchParams.set("country", country);
          
          try {
            const response = await fetch(countryApiUrl.toString());
            const responseText = await response.text();
            
            if (response.status === 401 || response.status === 403) {
              console.error(`API auth failed for ${country} on ${date}`);
              throw new Error("API authentication failed");
            }
            
            if (!response.ok) {
              console.log(`No data for ${country} on ${date}: status ${response.status}`);
              return [];
            }
            
            const data = JSON.parse(responseText);
            
            // Finnworlds devuelve HTTP 200 con code:404 cuando no hay datos
            if (data.code === 404 || data.code === "404") {
              console.log(`No events for ${country} on ${date} (404)`);
              return [];
            }
            
            // Manejar error de rate limiting
            if (data.error && data.error.includes("limit per minute")) {
              console.warn(`Rate limit hit for ${country} on ${date}, retrying after delay...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              // Reintentar una vez
              const retryResponse = await fetch(countryApiUrl.toString());
              const retryText = await retryResponse.text();
              const retryData = JSON.parse(retryText);
              if (retryData.result && retryData.result.output) {
                console.log(`Retry successful: ${retryData.result.output.length} events for ${country} on ${date}`);
                return retryData.result.output;
              }
              return [];
            }
            
            // Finnworlds devuelve múltiples formatos:
            // 1. { status: {...}, result: { output: [...] } }
            if (data.result && data.result.output && Array.isArray(data.result.output)) {
              console.log(`Fetched ${data.result.output.length} events for ${country} on ${date}`);
              return data.result.output;
            }
            
            // 2. { result: [...] } (formato alternativo)
            if (data.result && Array.isArray(data.result)) {
              console.log(`Fetched ${data.result.length} events for ${country} on ${date} (alt format)`);
              return data.result;
            }
            
            // 3. Array directo [...]
            if (Array.isArray(data)) {
              console.log(`Fetched ${data.length} events for ${country} on ${date} (direct array)`);
              return data;
            }
            
            console.log(`Unexpected response format for ${country} on ${date}:`, JSON.stringify(data).substring(0, 200));
            return [];
          } catch (error) {
            console.error(`Error fetching data for ${country} on ${date}:`, error);
            return [];
          }
        });
        
            events = results.flat(); // Combinar todos los eventos
            console.log(`Total events after aggregation: ${events.length}, from ${results.length} requests`);
            
            // Guardar en caché incluso si no hay datos (cachear respuestas vacías)
            apiCache.set(cacheKey, { data: events, timestamp: Date.now() });
            console.log(`Cached ${events.length} events for ${cacheKey.substring(0, 100)}...`);
            
            return events;
          } catch (apiError) {
            console.error("Critical API error:", apiError);
            throw apiError;
          }
        })();
        
        // Guardar el lock
        fetchLocks.set(cacheKey, fetchPromise);
        
        try {
          events = await fetchPromise;
        } catch (apiError) {
          return res.status(500).json({ 
            error: "API connection failed",
            message: "Error al cargar los datos económicos desde Finnworlds API. Verifica la conexión."
          });
        } finally {
          // Limpiar el lock después de que termine (éxito o fallo)
          fetchLocks.delete(cacheKey);
        }
      }
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

      // Apply impact filter if specified
      if (impacts && typeof impacts === "string" && impacts.trim()) {
        const selectedImpacts = impacts.split(',').map(i => i.trim());
        normalizedEvents = normalizedEvents.filter((event) => {
          return selectedImpacts.includes(event.impact);
        });
      }

      // Apply category filter if specified
      if (categories && typeof categories === "string" && categories.trim()) {
        const selectedCategories = categories.split(',').map(c => c.trim());
        normalizedEvents = normalizedEvents.filter((event) => {
          const eventCategories = categorizeEvent(event.event);
          return selectedCategories.some(cat => eventCategories.includes(cat));
        });
      }

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
