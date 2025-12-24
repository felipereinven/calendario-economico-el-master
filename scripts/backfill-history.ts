
import puppeteer from "puppeteer";
import { storage } from "../server/storage";
import { createHash } from "crypto";
import { parse, format as formatDate } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { es } from "date-fns/locale";
import { categorizeEvent } from "../server/utils/event-taxonomy";

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

async function runBackfill() {
  console.log("🚀 Iniciando Backfill Manual (Dic 1 - Futuro)...");
  
  // Rango deseado: Desde 01/12/2024 hasta un mes en el futuro (ej: 31/01/2025)
  const FECHA_INICIO = "01/12/2024"; 
  const FECHA_FIN = "31/01/2025"; 

  const browser = await puppeteer.launch({ 
    headless: true,
    args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
    ],
  }); 
  const page = await browser.newPage();
  
  try {
    await page.emulateTimezone("Europe/Madrid");
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    console.log("📄 Cargando página de Investing.com...");
    await page.goto("https://es.investing.com/economic-calendar/", { waitUntil: "networkidle2", timeout: 60000 });

    // 1. ABRIR SELECTOR DE FECHAS
    console.log("🛠️ Abriendo selector de fechas...");
    await page.waitForSelector('#datePickerToggleBtn', { timeout: 10000 });
    await page.click('#datePickerToggleBtn');
    await new Promise(r => setTimeout(r, 1000));

    // 2. ESCRIBIR FECHAS
    console.log(`📅 Estableciendo rango: ${FECHA_INICIO} - ${FECHA_FIN}`);
    
    // Borrar y escribir fecha inicio (Click triple para seleccionar todo)
    await page.click('#startDate', { clickCount: 3 });
    await new Promise(r => setTimeout(r, 500));
    await page.keyboard.press('Backspace');
    await page.type('#startDate', FECHA_INICIO);
    await new Promise(r => setTimeout(r, 500));

    // Borrar y escribir fecha fin
    await page.click('#endDate', { clickCount: 3 });
    await new Promise(r => setTimeout(r, 500));
    await page.keyboard.press('Backspace');
    await page.type('#endDate', FECHA_FIN);
    await new Promise(r => setTimeout(r, 500));

    // Verificar valores
    const values = await page.evaluate(() => {
        return {
            start: (document.querySelector('#startDate') as HTMLInputElement)?.value,
            end: (document.querySelector('#endDate') as HTMLInputElement)?.value
        };
    });
    console.log(`   Valores en inputs: Start='${values.start}', End='${values.end}'`);

    // 3. APLICAR
    console.log("🖱️ Aplicando filtro de fechas...");
    await page.click('#applyBtn');

    // Wait for loading to start
    try {
        await page.waitForSelector("#economicCalendarData .loadingDiv", { timeout: 5000 });
        console.log("   Loading div detected...");
    } catch (e) {
        console.log("⚠️ Loading div didn't appear quickly (might be too fast).");
    }

    // Esperar a que recargue la tabla
    await page.waitForFunction(() => !document.querySelector("#economicCalendarData .loadingDiv"), { timeout: 60000 });
    console.log("   Tabla recargada.");
    await new Promise(r => setTimeout(r, 5000)); // Extra wait for DOM rendering

    // 4. EXTRAER DATOS
    console.log("🔍 Extrayendo datos...");
    const eventosRaw = await page.evaluate(() => {
      const filas = document.querySelectorAll("#economicCalendarData tbody tr");
      const resultados: any[] = [];
      let fechaActual = "";

      filas.forEach((fila) => {
        // 1. Detectar el separador de fecha
        // Investing usa la clase 'theDay' para el TR o para un TD dentro del TR
        if (fila.classList.contains("theDay") || fila.querySelector(".theDay")) {
          fechaActual = fila.textContent?.trim() || "";
          return;
        }

        // 2. Si no es un evento, ignorar
        if (!fila.id || !fila.id.startsWith("eventRowId_")) return;

        // 3. Solo procesar si tenemos una fecha capturada
        // Si fechaActual sigue vacía, buscamos hacia arriba en el DOM por seguridad
        if (!fechaActual) {
            // Intento de rescate: buscar el texto del separador de fecha más cercano hacia arriba
            let sibling = fila.previousElementSibling;
            while (sibling) {
                if (sibling.classList.contains("theDay")) {
                    fechaActual = sibling.textContent?.trim() || "";
                    break;
                }
                sibling = sibling.previousElementSibling;
            }
        }

        const id = fila.id.replace("eventRowId_", "");
        const hora = fila.querySelector(".time")?.textContent?.trim() || "";
        const evento = fila.querySelector(".event")?.textContent?.trim() || "";
        
        // Capturar el país del title de la bandera
        const flagImg = fila.querySelector(".flagCur .ceFlags");
        const paisOrigen = flagImg?.getAttribute("title") || "";
        const moneda = fila.querySelector(".flagCur")?.textContent?.trim().split(" ")[0] || "";

        const sentimentIcons = fila.querySelector("td.sentiment")?.querySelectorAll(".grayFullBullishIcon").length || 0;
        let impacto = "low";
        if (sentimentIcons === 2) impacto = "medium";
        if (sentimentIcons === 3) impacto = "high";

        const actual = document.querySelector(`#eventActual_${id}`)?.textContent?.trim() || "";
        const prevision = document.querySelector(`#eventForecast_${id}`)?.textContent?.trim() || "";
        const previo = document.querySelector(`#eventPrevious_${id}`)?.textContent?.trim() || "";

        if (hora && evento && fechaActual) {
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
            previo
          });
        }
      });
      return resultados;
    });

    console.log(`✅ Se encontraron ${eventosRaw.length} eventos históricos.`);

    // 5. PROCESAR Y GUARDAR
    const eventosFiltrados = eventosRaw.filter((ev) => {
      const esPaisObjetivo = Object.keys(PAISES_OBJETIVO).some(
        (nombrePais) =>
          ev.paisOrigen.includes(nombrePais) || nombrePais.includes(ev.paisOrigen)
      );
      const esMonedaObjetivo = !!currencyToCountry[ev.moneda];
      return esPaisObjetivo || esMonedaObjetivo;
    });

    console.log(`🎯 Eventos filtrados: ${eventosFiltrados.length} (países objetivo)`);

    const eventosParaGuardar = eventosFiltrados.map((ev) => {
      let country = { code: "UNK", name: "Unknown" };
      
      // Intentar identificar país por nombre
      for (const [key, val] of Object.entries(PAISES_OBJETIVO)) {
        if (ev.paisOrigen.includes(key) || key.includes(ev.paisOrigen)) {
          country = val;
          break;
        }
      }

      // Fallback por moneda
      if (country.code === "UNK" && currencyToCountry[ev.moneda]) {
        country = currencyToCountry[ev.moneda];
      }

      // Parsear fecha (formato español: "jueves, 24 de diciembre de 2025")
      let dateStr = "";
      try {
        // Eliminar el día de la semana (ej: "jueves, ")
        const cleanDateStr = ev.fecha.split(",")[1]?.trim() || ev.fecha;
        console.log(`Intentando parsear: "${ev.fecha}" -> Clean: '${cleanDateStr}'`);
        const parsedDate = parse(cleanDateStr, "d 'de' MMMM 'de' yyyy", new Date(), { locale: es });
        dateStr = formatDate(parsedDate, "yyyy-MM-dd");
      } catch (e) {
        console.error(`Error parseando fecha: ${ev.fecha}`, e);
        dateStr = formatDate(new Date(), "yyyy-MM-dd"); // Fallback a hoy
      }

      // Timestamp UTC
      const dateTimeString = `${dateStr}T${ev.hora}`;
      const eventTimestamp = fromZonedTime(dateTimeString, "Europe/Madrid");

      // Categorizar
      const category = categorizeEvent(ev.evento);

      return {
        id: ev.id,
        eventTimestamp,
        date: dateStr,
        time: ev.hora,
        country: country.code,
        countryName: country.name,
        event: ev.evento,
        eventOriginal: ev.evento, // Asumimos español por ahora
        impact: ev.impacto,
        actual: ev.actual || null,
        forecast: ev.prevision || null,
        previous: ev.previo || null,
        category: category || null,
        fetchedAt: new Date(),
      };
    });

    if (eventosParaGuardar.length > 0) {
      console.log(`💾 Guardando ${eventosParaGuardar.length} eventos en base de datos...`);
      await storage.saveCachedEvents(eventosParaGuardar);
      console.log("✅ Guardado completado.");
    } else {
      console.log("⚠️ No hay eventos para guardar.");
    }

  } catch (e) {
    console.error("Error:", e);
  } finally {
    await browser.close();
    process.exit(0);
  }
}

runBackfill();
