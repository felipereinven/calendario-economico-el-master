/**
 * Script de migración para re-traducir todos los eventos en la base de datos
 * con el nuevo sistema de traducción profesional
 */

import { db } from './server/db';
import { cachedEvents } from '@shared/schema';
import { translateEventName } from './server/utils/event-taxonomy';
import { eq } from 'drizzle-orm';

async function migrateTranslations() {
  console.log('🔄 INICIANDO MIGRACIÓN DE TRADUCCIONES\n');
  console.log('='.repeat(80));
  
  try {
    // 1. Obtener todos los eventos de la base de datos
    console.log('📥 Obteniendo eventos de la base de datos...');
    const allEvents = await db.select().from(cachedEvents);
    console.log(`✅ Encontrados ${allEvents.length} eventos en total\n`);
    
    if (allEvents.length === 0) {
      console.log('⚠️  No hay eventos en la base de datos para migrar.\n');
      return;
    }
    
    // 2. Re-traducir cada evento (procesamiento por lotes)
    let updated = 0;
    let unchanged = 0;
    let errors = 0;
    const exampleUpdates: Array<{old: string, new: string}> = [];
    
    console.log('🔄 Re-traduciendo eventos...\n');
    
    // Procesar en lotes de 50 para mejorar rendimiento
    const batchSize = 50;
    for (let batchStart = 0; batchStart < allEvents.length; batchStart += batchSize) {
      const batch = allEvents.slice(batchStart, batchStart + batchSize);
      
      // Procesar todos los eventos del lote
      const updates = [];
      for (const event of batch) {
        try {
          const originalEnglish = event.eventOriginal;
          const newTranslation = translateEventName(originalEnglish);
          
          if (event.event !== newTranslation) {
            updates.push({
              id: event.id,
              newTranslation,
              oldTranslation: event.event
            });
            
            // Guardar ejemplos (primeros 10)
            if (exampleUpdates.length < 10) {
              exampleUpdates.push({ old: event.event, new: newTranslation });
            }
          }
        } catch (error) {
          errors++;
          console.error(`❌ Error procesando evento ${event.id}:`, error);
        }
      }
      
      // Ejecutar actualizaciones del lote
      for (const update of updates) {
        try {
          await db
            .update(cachedEvents)
            .set({ event: update.newTranslation })
            .where(eq(cachedEvents.id, update.id));
          updated++;
        } catch (error) {
          errors++;
          console.error(`❌ Error actualizando evento ${update.id}:`, error);
        }
      }
      
      unchanged += batch.length - updates.length;
      
      // Mostrar progreso
      const processed = Math.min(batchStart + batchSize, allEvents.length);
      if (processed % 100 === 0 || processed === allEvents.length) {
        console.log(`   Progreso: ${processed}/${allEvents.length} eventos procesados (${updated} actualizados)...`);
      }
    }
    
    // Mostrar ejemplos al final
    console.log('\n📝 Ejemplos de actualizaciones:\n');
    exampleUpdates.forEach(({ old, new: newTrans }, i) => {
      console.log(`   ${i + 1}. "${old}" → "${newTrans}"`);
    });
    
    // 3. Resumen de resultados
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE MIGRACIÓN:\n');
    console.log(`   Total de eventos:      ${allEvents.length}`);
    console.log(`   ✅ Actualizados:       ${updated}`);
    console.log(`   ⏭️  Sin cambios:        ${unchanged}`);
    console.log(`   ❌ Errores:            ${errors}`);
    console.log(`   📈 Tasa de éxito:      ${((updated + unchanged) / allEvents.length * 100).toFixed(1)}%`);
    
    console.log('\n🎉 ¡Migración completada exitosamente!\n');
    
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateTranslations()
  .then(() => {
    console.log('✅ Script finalizado correctamente\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
