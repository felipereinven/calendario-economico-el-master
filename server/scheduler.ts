import cron from "node-cron";
import { refreshAllRanges, refreshTodayOnly } from "./services/investing-scraper";

export function startScheduler() {
  console.log("⏰ Iniciando planificador de tareas (Cron) - Zona: America/Bogota");

  // -----------------------------------------------------------
  // TAREA 1: BARRIDO COMPLETO (6:00 AM Colombia)
  // Descarga: Ayer, Hoy, Mañana, Esta Semana, Próxima Semana
  // -----------------------------------------------------------
  cron.schedule("0 6 * * *", async () => {
    console.log("🌅 [06:00 AM] Ejecutando barrido matutino completo...");
    try {
      await refreshAllRanges();
      console.log("🏁 [06:00 AM] Barrido completo finalizado.");
    } catch (e) {
      console.error("⚠️ Error en barrido matutino:", e);
    }
  }, {
    timezone: "America/Bogota"
  });

  // -----------------------------------------------------------
  // TAREA 2: ACTUALIZACIÓN RÁPIDA (2:00 PM Colombia)
  // Descarga: Solo Hoy (para llenar datos 'Actual' vacíos)
  // -----------------------------------------------------------
  cron.schedule("0 14 * * *", async () => {
    console.log("☀️ [02:00 PM] Ejecutando actualización de tarde...");
    try {
      await refreshTodayOnly();
      console.log("🏁 [02:00 PM] Actualización rápida finalizada.");
    } catch (e) {
      console.error("⚠️ Error en actualización de tarde:", e);
    }
  }, {
    timezone: "America/Bogota"
  });
}
