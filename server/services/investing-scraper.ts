import puppeteer from "puppeteer";
import { createHash } from "crypto";
import { parseISO, parse, format as formatDate } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { es } from "date-fns/locale";
import { storage } from "../storage";
import type { InsertCachedEvent } from "@shared/schema";
import { categorizeEvent } from "../utils/event-taxonomy";

// Caché en memoria por rango (1 hora de validez)
const cache: Map<string, { data: InsertCachedEvent[]; timestamp: number }> = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora

// Rangos válidos soportados
export type TimeRange = "yesterday" | "today" | "tomorrow" | "thisWeek" | "nextWeek" | "lastWeek";
const VALID_RANGES: TimeRange[] = ["yesterday", "today", "tomorrow", "thisWeek", "nextWeek", "lastWeek"];

// Mapeo de nombres de países en Investing.com a códigos ISO-3
const PAISES_OBJETIVO: Record<string, { code: string; name: string }> = {
  "Estados Unidos": { code: "USA", name: "United States" },
  "EE.UU.": { code: "USA", name: "United States" },
  "Zona Euro": { code: "EUR", name: "Eurozone" },
  "Eurozona": { code: "EUR", name: "Eurozone" },
  "Alemania": { code: "DEU", name: "Germany" },
  "Francia": { code: "FRA", name: "France" },
  "España": { code: "ESP", name: "Spain" },
  "Reino Unido": { code: "GBR", name: "United Kingdom" },
  "China": { code: "CHN", name: "China" },
  "Japón": { code: "JPN", name: "Japan" },
};

// Mapeo adicional por código de moneda (fallback)
const currencyToCountry: Record<string, { code: string; name: string }> = {
  USD: { code: "USA", name: "United States" },
  EUR: { code: "EUR", name: "Eurozone" },
  GBP: { code: "GBR", name: "United Kingdom" },
  JPY: { code: "JPN", name: "Japan" },
  CNY: { code: "CHN", name: "China" },
  RMB: { code: "CHN", name: "China" },
};

interface ScrapedEvent {
  id: string;
  fecha: string;
  hora: string;
  paisOrigen: string;
  moneda: string;
  evento: string;
  impacto: string;
  actual: string;
  prevision: string;
  previo: string;
}

/**
 * Calculate the date based on the time range
 */
function getDateFromTimeRange(timeRange: TimeRange): string {
  const today = new Date();
  
  switch (timeRange) {
    case "yesterday":
      today.setDate(today.getDate() - 1);
      break;
    case "today":
      // Keep as is
      break;
    case "tomorrow":
      today.setDate(today.getDate() + 1);
      break;
    case "thisWeek":
    case "nextWeek":
    case "lastWeek":
      // These return multiple dates, handled later
      return "";
    default:
      break;
  }
  
  return formatDate(today, "yyyy-MM-dd");
}

/**
 * Scrape events from Investing.com for a specific time range
 */
async function scrapeInvestingCalendar(timeRange: TimeRange = "today"): Promise<InsertCachedEvent[]> {
  console.log(`🌐 Iniciando scraping de Investing.com (${timeRange})...`);
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      protocolTimeout: 240000, // 4 minutos para páginas pesadas
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    // Bloquear recursos pesados para acelerar carga
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'font', 'stylesheet'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 🔒 Investing.com muestra las horas en GMT+1 (Europe/Madrid timezone)
    // Forzamos este timezone para obtener las horas correctas
    await page.emulateTimezone("Europe/Madrid");

    // Configurar como usuario real
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Ir al calendario en español
    console.log("📄 Cargando página de Investing.com...");
    await page.goto("https://es.investing.com/economic-calendar/", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    // Esperar a que cargue la tabla
    await page.waitForSelector("#economicCalendarData", { timeout: 15000 });

    // 🔧 APLICAR FILTROS DE PAÍSES Y CATEGORÍAS
    console.log("🔧 Intentando aplicar filtros en la web...");
    try {
      await page.waitForSelector('#filterStateAnchor', { timeout: 10000 });
      await page.click('#filterStateAnchor');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const PAISES_IDS: Record<string, string> = {
        'USA': '5', 'EUR': '72', 'DEU': '17', 'FRA': '22',
        'ESP': '26', 'GBR': '4', 'CHN': '37', 'JPN': '35'
      };

      const CATEGORIAS_TEXTO = [
        'Empleo', 'Actividad económica', 'Inflación', 'Crédito',
        'Banco central', 'Índice de confianza', 'Balance', 'Bonos'
      ];

      // Aplicar filtros en una sola operación para reducir latencia
      await page.evaluate((paises, categorias) => {
        // Desmarcar todo
        document.querySelectorAll('#countries_ul li input').forEach((el: any) => el.checked = false);
        document.querySelectorAll('#categories_ul li input').forEach((el: any) => el.checked = false);

        // Marcar países objetivo
        Object.values(paises).forEach((id: any) => {
          const check = document.querySelector(`#country${id}`) as HTMLInputElement;
          if (check) check.checked = true;
        });

        // Marcar categorías objetivo
        const items = document.querySelectorAll('#categories_ul li label');
        items.forEach(label => {
          if (categorias.some((cat: string) => label.textContent?.includes(cat))) {
            const checkbox = document.getElementById(label.getAttribute('for') || '') as HTMLInputElement;
            if (checkbox) checkbox.checked = true;
          }
        });
      }, PAISES_IDS, CATEGORIAS_TEXTO);

      await page.click('#ecSubmitButton');
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log("✅ Filtros aplicados correctamente");
    } catch {
      console.log("⚠️ Filtros web saltados (anuncio bloqueando el click). El backend filtrará los datos.");
    }

    // Navegar al rango de tiempo solicitado (si no es "today")
    if (timeRange !== "today") {
      const selector = `#timeFrame_${timeRange}`;
      console.log(`🔄 Cambiando a tab: ${timeRange}`);
      
      try {
        await page.waitForSelector(selector, { timeout: 10000 });
        await page.click(selector);
        
        // 🛑 PUNTO CRÍTICO: Esperar a que la tabla cambie.
        console.log("⏳ Esperando recarga de tabla...");
        await page.waitForFunction(
          () => !document.querySelector("#economicCalendarData .loadingDiv") && 
                document.querySelector("#economicCalendarData tbody tr"),
          { timeout: 30000 } // 30 segundos para recarga
        );
        
        // Pausa de seguridad para renderizado completo
        await new Promise(resolve => setTimeout(resolve, 4000));
      } catch (error) {
        console.warn(`⚠️ No se pudo cambiar al tab ${timeRange}, usando default`);
      }
    }

    // Extraer eventos del DOM
    console.log("🔍 Extrayendo eventos...");
    const eventos: ScrapedEvent[] = await page.evaluate(() => {
      const filas = document.querySelectorAll("#economicCalendarData tbody tr");
      const resultados: ScrapedEvent[] = [];
      let fechaActual = "";
      const fechasEncontradas: string[] = [];

      filas.forEach((fila) => {
        // Capturar fecha de las filas de encabezado
        // Pueden ser filas con clase "theDay" O filas sin ID que contienen solo el texto de fecha
        if (fila.classList.contains("theDay") || (!fila.id && fila.textContent && fila.textContent.includes("de"))) {
          // Intentar con selector .theDay primero
          let dateElement = fila.querySelector(".theDay");
          // Si no existe, usar el textContent directo
          if (!dateElement && fila.textContent) {
            fechaActual = fila.textContent.trim();
          } else if (dateElement) {
            fechaActual = dateElement.textContent?.trim() || "";
          }
          
          if (fechaActual) {
            fechasEncontradas.push(fechaActual);
          }
          return;
        }

        // Ignorar filas vacías
        if (!fila.id || !fila.id.startsWith("eventRowId_")) return;

        // Extraer hora
        const horaElement = fila.querySelector(".time");
        const hora = horaElement?.textContent?.trim() || "";

        // Extraer moneda
        const monedaElement = fila.querySelector(".flagCur");
        const moneda = monedaElement?.textContent?.trim().split(" ")[0] || "";

        // Extraer país del atributo title del icono de bandera
        const paisElement = fila.querySelector(".flagCur .ceFlags");
        const paisOrigen = paisElement?.getAttribute("title") || "";

        // Extraer nombre del evento
        const eventoElement = fila.querySelector(".event a");
        const evento = eventoElement?.textContent?.trim() || "";

        // Calcular importancia (iconos llenos de toro/bull)
        const sentimentCell = fila.querySelector("td.sentiment");
        const iconosLlenos = sentimentCell?.querySelectorAll(".grayFullBullishIcon").length || 0;
        let impacto = "low";
        if (iconosLlenos === 2) impacto = "medium";
        if (iconosLlenos === 3) impacto = "high";

        // Extraer ID del evento
        const id = fila.id.replace("eventRowId_", "");

        // Datos numéricos
        const actualElement = document.querySelector(`#eventActual_${id}`);
        const previsionElement = document.querySelector(`#eventForecast_${id}`);
        const previoElement = document.querySelector(`#eventPrevious_${id}`);

        const actual = actualElement?.textContent?.trim() || "";
        const prevision = previsionElement?.textContent?.trim() || "";
        const previo = previoElement?.textContent?.trim() || "";

        if (hora && evento) {
          resultados.push({
            id,
            fecha: fechaActual,
            hora,
            paisOrigen,
            moneda,
            evento,
            impacto,
            actual,
            prevision,
            previo,
          });
        }
      });

      // Debugging: agregar las fechas encontradas al resultado
      (resultados as any).fechasDOM = fechasEncontradas;
      return resultados;
    });

    console.log(`✅ Scraping completo: ${eventos.length} eventos encontrados`);
    console.log(`📅 Fechas capturadas del DOM:`, (eventos as any).fechasDOM || []);

    // Filtrar solo países objetivo
    const eventosFiltrados = eventos.filter((ev) => {
      // Verificar si el país está en la lista objetivo
      const esPaisObjetivo = Object.keys(PAISES_OBJETIVO).some(
        (nombrePais) =>
          ev.paisOrigen.includes(nombrePais) || nombrePais.includes(ev.paisOrigen)
      );
      
      // También aceptar si la moneda coincide
      const esMonedaObjetivo = !!currencyToCountry[ev.moneda];
      
      return esPaisObjetivo || esMonedaObjetivo;
    });

    console.log(`🎯 Eventos filtrados: ${eventosFiltrados.length} (países objetivo)`);

    // Calcular fecha base del rango para casos donde el DOM no incluye fecha
    const fechaBase = getDateFromTimeRange(timeRange);

    // Convertir a formato de base de datos
    const normalizedEvents: InsertCachedEvent[] = eventosFiltrados.map((evento) => {
      // Parsear hora (formato "HH:mm" o "Todo el día")
      let time = "00:00:00";
      if (evento.hora && evento.hora !== "Todo el día" && evento.hora.includes(":")) {
        const [hours, minutes] = evento.hora.split(":");
        time = `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`;
      }

      // Determinar país por nombre o moneda
      let country = { code: "GLOBAL", name: "Global" };
      
      // Primero intentar por nombre de país
      for (const [nombrePais, datos] of Object.entries(PAISES_OBJETIVO)) {
        if (evento.paisOrigen.includes(nombrePais) || nombrePais.includes(evento.paisOrigen)) {
          country = datos;
          break;
        }
      }
      
      // Si no se encontró, intentar por moneda
      if (country.code === "GLOBAL" && currencyToCountry[evento.moneda]) {
        country = currencyToCountry[evento.moneda];
      }

      // Parsear fecha (viene en formato "Lunes, 23 de diciembre de 2025")
      let date = fechaBase || new Date().toISOString().split("T")[0];
      try {
        if (evento.fecha) {
          // Extraer solo la parte numérica: "23 de diciembre de 2025"
          const fechaMatch = evento.fecha.match(/\d+\s+de\s+\w+\s+de\s+\d{4}/);
          if (fechaMatch) {
            const parsedDate = parse(fechaMatch[0], "d 'de' MMMM 'de' yyyy", new Date(), { locale: es });
            date = formatDate(parsedDate, "yyyy-MM-dd");
          }
        }
      } catch (error) {
        console.warn(`Error parseando fecha: ${evento.fecha}`);
      }

      // El evento ya viene en español desde Investing.com
      const eventNameSpanish = evento.evento;

      // Categorizar evento basado en keywords en español
      const categories = categorizeEvent(eventNameSpanish);
      const primaryCategory = categories.length > 0 ? categories[0] : null;

      // IMPORTANTE: Investing.com muestra las horas en GMT+1 (CET/CEST - Europe/Madrid)
      // Guardamos la hora original tal como viene, y el timestamp se ajusta considerando GMT+1
      // La conversión a la zona horaria del usuario se hace en el momento de consulta
      
      // 1. Combinar fecha y hora en un string ISO
      const dateTimeString = `${date}T${time}`; // Ej: "2025-12-24T14:30:00"

      // 2. MAGIA DE ZONA HORARIA:
      // Le decimos: "Esta hora es de Madrid". La librería sabe si en esa fecha
      // Madrid estaba en invierno (GMT+1) o verano (GMT+2) y lo convierte a UTC perfecto.
      const eventTimestamp = fromZonedTime(dateTimeString, "Europe/Madrid");

      // Generar ID determinístico
      const eventId = createHash("sha256")
        .update(`${date}-${time}-${country.code}-${eventNameSpanish}`)
        .digest("hex")
        .substring(0, 32);

      return {
        id: eventId,
        eventTimestamp, // Timestamp en UTC (ajustado desde GMT+1)
        date,
        time, // Hora original de Investing.com (GMT+1) - NO modificada
        country: country.code,
        countryName: country.name,
        event: eventNameSpanish,
        eventOriginal: eventNameSpanish,
        impact: evento.impacto as "high" | "medium" | "low",
        actual: evento.actual || null,
        forecast: evento.prevision || null,
        previous: evento.previo || null,
        category: primaryCategory,
      };
    });

    return normalizedEvents;
  } catch (error) {
    console.error("❌ Error en scraping:", error);
    if (browser) await browser.close();
    throw error;
  }
}

/**
 * Get events from Investing.com with caching and DB persistence
 */
export async function getInvestingEvents(timeRange: TimeRange = "today"): Promise<InsertCachedEvent[]> {
  const now = Date.now();
  const cacheKey = timeRange;

  // Verificar caché en memoria
  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    console.log(`⚡ Usando datos en caché de memoria (${timeRange})`);
    return cached.data;
  }

  console.log(`🔄 Caché expirado, iniciando scraping (${timeRange})...`);

  // Hacer scraping
  const events = await scrapeInvestingCalendar(timeRange);

  // Guardar en base de datos
  if (events.length > 0) {
    console.log(`💾 Guardando ${events.length} eventos en base de datos...`);
    await storage.saveCachedEvents(events);
  }

  // Guardar en caché de memoria
  cache.set(cacheKey, { data: events, timestamp: now });

  return events;
}

/**
 * Refresh events for all time ranges and save to database
 * Use this for scheduled jobs
 */
export async function refreshAllRanges(): Promise<void> {
  console.log("🔄 Refrescando todos los rangos de Investing.com...");
  
  // Incluimos "lastWeek" para tener historial en el arranque inicial (Day 0)
  const ranges: TimeRange[] = ["lastWeek", "yesterday", "today", "tomorrow", "thisWeek", "nextWeek"];
  
  for (const range of ranges) {
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`  📥 Procesando: ${range} (Intento ${attempts + 1}/${maxAttempts})`);
        await getInvestingEvents(range);
        
        // Pequeño delay entre rangos para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 2000));
        break; // Éxito, salir del loop de reintentos
      } catch (error) {
        attempts++;
        console.error(`  ❌ Error en ${range} (Intento ${attempts}):`, error);
        if (attempts === maxAttempts) {
          console.error(`  💀 Falló definitivamente ${range} después de ${maxAttempts} intentos.`);
        } else {
          console.log(`  ⏳ Reintentando ${range} en 5 segundos...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
  }
  
  console.log("✅ Refresh completo de todos los rangos");
}

/**
 * Clear cache (útil para testing)
 */
export function clearInvestingCache(timeRange?: TimeRange): void {
  if (timeRange) {
    cache.delete(timeRange);
    console.log(`🗑️  Caché de Investing.com limpiado (${timeRange})`);
  } else {
    cache.clear();
    console.log("🗑️  Todo el caché de Investing.com limpiado");
  }
}

/**
 * Check if a time range is valid
 */
export function isValidTimeRange(range: string): range is TimeRange {
  return VALID_RANGES.includes(range as TimeRange);
}

/**
 * Actualización Rápida: Solo obtiene datos de HOY.
 * Ideal para ejecutarse a mitad del día (ej: 2 PM) para rellenar
 * los valores "Actual" que salieron durante la mañana.
 */
export async function refreshTodayOnly(): Promise<void> {
  console.log("⚡ Iniciando actualización rápida (Solo HOY)...");
  
  try {
    // Solo pedimos "today". Esto es mucho más rápido y ligero.
    await getInvestingEvents("today");
    
    // Opcional: Si a las 2PM ya quieres tener listos los de mañana temprano (Asia/Europa)
    // descomenta la siguiente línea:
    // await getInvestingEvents("tomorrow");
    
    console.log("✅ Actualización rápida completada con éxito.");
  } catch (error) {
    console.error("❌ Error crítico en refreshTodayOnly:", error);
    // No lanzamos el error para no detener el proceso de Cron, solo lo registramos
  }
}
