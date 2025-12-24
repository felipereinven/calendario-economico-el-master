import { db } from './server/db';
import { cachedEvents } from '@shared/schema';
import { translateEventName } from './server/utils/event-taxonomy';

async function checkSampleTranslations() {
  const samples = await db.select().from(cachedEvents).limit(20);
  
  console.log('📋 MUESTRA DE EVENTOS ACTUALES:\n');
  
  for (const event of samples) {
    const currentTranslation = event.event;
    const newTranslation = translateEventName(event.eventOriginal);
    const different = currentTranslation !== newTranslation;
    
    console.log(`Original (EN): ${event.eventOriginal}`);
    console.log(`Actual (ES):   ${currentTranslation}`);
    console.log(`Nuevo (ES):    ${newTranslation}`);
    console.log(`¿Diferente?:   ${different ? '✅ SÍ' : '⏭️  NO'}`);
    console.log('-'.repeat(80));
  }
  
  process.exit(0);
}

checkSampleTranslations();
