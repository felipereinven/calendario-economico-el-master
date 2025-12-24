
import puppeteer from "puppeteer";
import { storage } from "../server/storage";
import { parse, format as formatDate, addDays, isBefore } from "date-fns";
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

async function runUltraFastBackfill() {
  console.log("🚀 Iniciando Backfill ULTRA RÁPIDO (Dic 2025 - Ene 2026)...");
  
  const browser = await puppeteer.launch({
    headless: true, // Cambia a false si quieres ver el proceso
    protocolTimeout: 240000, // 4 minutos de margen para evitar timeouts
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();

  // 🚀 BLOQUEO QUIRÚRGICO (Dejamos pasar JS para que el calendario funcione)
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    // Bloqueamos imágenes, fuentes y CSS para ganar velocidad
    // Pero PERMITIMOS 'script' y 'document' que son necesarios para el calendario
    if (['image', 'font', 'stylesheet', 'media'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  try {
    await page.emulateTimezone("Europe/Madrid");
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    let fechaInicio = new Date(2025, 11, 1); // 1 de diciembre 2025
    const fechaFinTotal = new Date(2026, 0, 31); // 31 de enero 2026
    let totalEventosGuardados = 0;

    while (isBefore(fechaInicio, fechaFinTotal)) {
      const bloqueFin = addDays(fechaInicio, 6); // Bloques de 7 días
      const startStr = formatDate(fechaInicio, "dd/MM/yyyy");
      const endStr = formatDate(bloqueFin > fechaFinTotal ? fechaFinTotal : bloqueFin, "dd/MM/yyyy");

      console.log(`\n-----------------------------------------`);
      console.log(`🚀 BLOQUE: ${startStr} - ${endStr}`);
      
      // Sistema de reintentos por bloque si falla la carga
      let exitoso = false;
      let intentos = 0;

      while (!exitoso && intentos < 2) {
        try {
          // Navegar a la página
          await page.goto("https://es.investing.com/economic-calendar/", { 
            waitUntil: "domcontentloaded", 
            timeout: 60000 
          });

          // Esperar a que carguen los scripts del calendario
          await new Promise(r => setTimeout(r, 3000));

          // 🧹 LIMPIEZA DE POPUPS
          await page.evaluate(() => {
            const selectors = [
              '.promoModal', '.genPopup', '#onetrust-consent-sdk',
              '.overlay', '.popupDiv', '#PromoteSignUpPopUp',
              '[class*="modal"]', '[class*="popup"]'
            ];
            selectors.forEach(s => {
              const elements = document.querySelectorAll(s);
              elements.forEach(el => (el as HTMLElement).remove());
            });
          });

          // 📅 INTERACCIÓN CON EL CALENDARIO
          console.log("  📅 Abriendo selector...");
          
          await page.waitForSelector('#datePickerToggleBtn', { visible: true, timeout: 10000 });
          await page.click('#datePickerToggleBtn');

          // Esperar a que aparezca el contenedor del calendario (puede ser #ui-datepicker-div o #startDate)
          await page.waitForSelector('#ui-datepicker-div, #startDate', { visible: true, timeout: 10000 });
          await new Promise(r => setTimeout(r, 1000));

          console.log("  ✍️ Insertando fechas...");
          // ⚡ ESCRIBIR FECHAS CON EVALUACIÓN DIRECTA
          await page.evaluate((s, e) => {
            const startInput = document.querySelector('#startDate') as HTMLInputElement;
            const endInput = document.querySelector('#endDate') as HTMLInputElement;
            if (startInput && endInput) {
              startInput.value = s;
              endInput.value = e;
            }
          }, startStr, endStr);

          console.log("  🖱️ Aplicando filtro...");
          await page.click('#applyBtn');
          
          // Esperar a que la tabla se refresque
          console.log("  ⏳ Esperando actualización de tabla...");
          await new Promise(r => setTimeout(r, 5000));
          
          try {
            await page.waitForFunction(
              () => !document.querySelector("#economicCalendarData .loadingDiv"),
              { timeout: 20000 }
            );
          } catch (e) {
            console.log("  ⚠️ Timeout esperando loadingDiv, continuando...");
          }
          
          await new Promise(r => setTimeout(r, 2000));

          // 🔍 EXTRACCIÓN DE DATOS
          console.log("  🔍 Extrayendo datos...");
          const eventosRaw = await page.evaluate(() => {
            const filas = document.querySelectorAll("#economicCalendarData tbody tr");
            const resultados: any[] = [];
            let fechaActual = "";

            filas.forEach((fila) => {
              // 1. Detectar el separador de fecha
              if (fila.classList.contains("theDay") || fila.querySelector(".theDay")) {
                fechaActual = fila.textContent?.trim() || "";
                return;
              }

              // 2. Si no es un evento, ignorar
              if (!fila.id || !fila.id.startsWith("eventRowId_")) return;

              // 3. Solo procesar si tenemos una fecha capturada
              if (!fechaActual) {
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

          console.log(`  ✅ Encontrados ${eventosRaw.length} eventos en este bloque.`);

          // Filtrar y Procesar
          const eventosFiltrados = eventosRaw.filter((ev: ScrapedEvent) => {
            const esPaisObjetivo = Object.keys(PAISES_OBJETIVO).some(
              (nombrePais) => ev.paisOrigen.includes(nombrePais) || nombrePais.includes(ev.paisOrigen)
            );
            const esMonedaObjetivo = !!currencyToCountry[ev.moneda];
            return esPaisObjetivo || esMonedaObjetivo;
          });

          const eventosParaGuardar = eventosFiltrados.map((ev: ScrapedEvent) => {
            let country = { code: "UNK", name: "Unknown" };
            for (const [key, val] of Object.entries(PAISES_OBJETIVO)) {
              if (ev.paisOrigen.includes(key) || key.includes(ev.paisOrigen)) {
                country = val;
                break;
              }
            }
            if (country.code === "UNK" && currencyToCountry[ev.moneda]) {
              country = currencyToCountry[ev.moneda];
            }

            let dateStr = "";
            try {
              // Manejo de "Hoy", "Mañana", "Ayer" si aparecieran
              if (ev.fecha.toLowerCase().includes("hoy")) {
                dateStr = formatDate(new Date(), "yyyy-MM-dd");
              } else if (ev.fecha.toLowerCase().includes("mañana")) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                dateStr = formatDate(tomorrow, "yyyy-MM-dd");
              } else if (ev.fecha.toLowerCase().includes("ayer")) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                dateStr = formatDate(yesterday, "yyyy-MM-dd");
              } else {
                const cleanDateStr = ev.fecha.split(",")[1]?.trim() || ev.fecha;
                const parsedDate = parse(cleanDateStr, "d 'de' MMMM 'de' yyyy", new Date(), { locale: es });
                dateStr = formatDate(parsedDate, "yyyy-MM-dd");
              }
            } catch (e) {
              console.error(`Error parseando fecha: ${ev.fecha}`);
              dateStr = formatDate(new Date(), "yyyy-MM-dd");
            }

            const dateTimeString = `${dateStr}T${ev.hora}`;
            const eventTimestamp = fromZonedTime(dateTimeString, "Europe/Madrid");
            const category = categorizeEvent(ev.evento);

            return {
              id: ev.id,
              eventTimestamp,
              date: dateStr,
              time: ev.hora,
              country: country.code,
              countryName: country.name,
              event: ev.evento,
              eventOriginal: ev.evento,
              impact: ev.impacto,
              actual: ev.actual || null,
              forecast: ev.prevision || null,
              previous: ev.previo || null,
              category: category || null,
              fetchedAt: new Date(),
            };
          });

          if (eventosParaGuardar.length > 0) {
            await storage.saveCachedEvents(eventosParaGuardar);
            console.log(`  💾 Guardados ${eventosParaGuardar.length} eventos.`);
            totalEventosGuardados += eventosParaGuardar.length;
          } else {
            console.log("  ⚠️ Ningún evento relevante para guardar en este bloque.");
          }

          exitoso = true;
          console.log(`✅ Bloque ${startStr} completado.`);

        } catch (error) {
          intentos++;
          console.error(`  ❌ Intento ${intentos} fallido:`, error);
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (!exitoso) {
        console.log(`  ⚠️ Bloque ${startStr} omitido después de 2 intentos.`);
      }

      fechaInicio = addDays(bloqueFin, 1);
      
      // Pausa de seguridad entre rangos
      await new Promise(r => setTimeout(r, 3000));
    }
        const filas = document.querySelectorAll("#economicCalendarData tbody tr");
        const resultados: any[] = [];
        let fechaActual = "";

        filas.forEach((fila) => {
          // 1. Detectar el separador de fecha
          if (fila.classList.contains("theDay") || fila.querySelector(".theDay")) {
            fechaActual = fila.textContent?.trim() || "";
            return;
          }

          // 2. Si no es un evento, ignorar
          if (!fila.id || !fila.id.startsWith("eventRowId_")) return;

          // 3. Solo procesar si tenemos una fecha capturada
          if (!fechaActual) {
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

      console.log(`  ✅ Encontrados ${eventosRaw.length} eventos en este bloque.`);

      // Filtrar y Procesar
      const eventosFiltrados = eventosRaw.filter((ev: ScrapedEvent) => {
        const esPaisObjetivo = Object.keys(PAISES_OBJETIVO).some(
          (nombrePais) => ev.paisOrigen.includes(nombrePais) || nombrePais.includes(ev.paisOrigen)
        );
        const esMonedaObjetivo = !!currencyToCountry[ev.moneda];
        return esPaisObjetivo || esMonedaObjetivo;
      });

      const eventosParaGuardar = eventosFiltrados.map((ev: ScrapedEvent) => {
        let country = { code: "UNK", name: "Unknown" };
        for (const [key, val] of Object.entries(PAISES_OBJETIVO)) {
          if (ev.paisOrigen.includes(key) || key.includes(ev.paisOrigen)) {
            country = val;
            break;
          }
        }
        if (country.code === "UNK" && currencyToCountry[ev.moneda]) {
          country = currencyToCountry[ev.moneda];
        }

        let dateStr = "";
        try {
          // Manejo de "Hoy", "Mañana", "Ayer" si aparecieran
          if (ev.fecha.toLowerCase().includes("hoy")) {
            dateStr = formatDate(new Date(), "yyyy-MM-dd");
          } else if (ev.fecha.toLowerCase().includes("mañana")) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateStr = formatDate(tomorrow, "yyyy-MM-dd");
          } else if (ev.fecha.toLowerCase().includes("ayer")) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            dateStr = formatDate(yesterday, "yyyy-MM-dd");
          } else {
            const cleanDateStr = ev.fecha.split(",")[1]?.trim() || ev.fecha;
            const parsedDate = parse(cleanDateStr, "d 'de' MMMM 'de' yyyy", new Date(), { locale: es });
            dateStr = formatDate(parsedDate, "yyyy-MM-dd");
          }
        } catch (e) {
          console.error(`Error parseando fecha: ${ev.fecha}`);
          dateStr = formatDate(new Date(), "yyyy-MM-dd");
        }

        const dateTimeString = `${dateStr}T${ev.hora}`;
        const eventTimestamp = fromZonedTime(dateTimeString, "Europe/Madrid");
        const category = categorizeEvent(ev.evento);

        return {
          id: ev.id,
          eventTimestamp,
          date: dateStr,
          time: ev.hora,
          country: country.code,
          countryName: country.name,
          event: ev.evento,
          eventOriginal: ev.evento,
          impact: ev.impacto,
          actual: ev.actual || null,
          forecast: ev.prevision || null,
          previous: ev.previo || null,
          category: category || null,
          fetchedAt: new Date(),
        };
      });

      if (eventosParaGuardar.length > 0) {
        await storage.saveCachedEvents(eventosParaGuardar);
        console.log(`  💾 Guardados ${eventosParaGuardar.length} eventos.`);
        totalEventosGuardados += eventosParaGuardar.length;
      } else {
        console.log("  ⚠️ Ningún evento relevante para guardar en este bloque.");
      }

      fechaInicio = addDays(bloqueFin, 1);
      
      // Pausa de seguridad entre rangos
      await new Promise(r => setTimeout(r, 4000));
    }

    console.log(`\n🎉 Backfill completado. Total eventos guardados: ${totalEventosGuardados}`);

  } catch (err) {
    console.error("❌ Error fatal:", err);
  } finally {
    await browser.close();
    process.exit(0);
  }
}

runUltraFastBackfill();
