import { getInvestingEvents } from "../server/services/investing-scraper";
import { storage } from "../server/storage";

async function syncAllTabs() {
  console.log("🚀 Iniciando sincronización de pestañas nativas (Ayer -> Futuro cercano)...\n");
  
  const tabs = [
    { range: 'yesterday' as const, label: 'Ayer' },
    { range: 'today' as const, label: 'Hoy' },
    { range: 'tomorrow' as const, label: 'Mañana' },
    { range: 'thisWeek' as const, label: 'Esta Semana' },
    { range: 'nextWeek' as const, label: 'Próxima Semana' }
  ];

  let totalEventos = 0;

  for (const tab of tabs) {
    console.log(`📂 Procesando: ${tab.label}...`);
    
    try {
      const eventos = await getInvestingEvents(tab.range);
      
      if (eventos && eventos.length > 0) {
        // Mostrar resumen de fechas antes de guardar
        const fechas = eventos.reduce((acc, ev) => {
          acc[ev.date] = (acc[ev.date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log(`📅 Fechas encontradas:`, Object.entries(fechas).map(([date, count]) => `${date}(${count})`).join(', '));
        
        await storage.saveCachedEvents(eventos);
        console.log(`✅ ${tab.label}: ${eventos.length} eventos guardados`);
        totalEventos += eventos.length;
      } else {
        console.log(`⚠️  ${tab.label}: Sin eventos`);
      }
      
      // Pausa entre pestañas para no saturar
      await new Promise(r => setTimeout(r, 2000));
      
    } catch (error) {
      console.error(`❌ Error en ${tab.label}:`, error);
    }
  }

  console.log(`\n🎉 Sincronización completada. Total: ${totalEventos} eventos guardados.`);
}

syncAllTabs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error fatal:", err);
    process.exit(1);
  });
