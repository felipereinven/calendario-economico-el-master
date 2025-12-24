import { db } from "./server/db";
import { cachedEvents } from "./shared/schema";
import { sql } from "drizzle-orm";

async function queryDB() {
  console.log("🔍 Consultando base de datos directamente...\n");

  // Contar todos los eventos
  const total = await db.select({ count: sql<number>`count(*)` }).from(cachedEvents);
  console.log(`Total de eventos en cached_events: ${total[0].count}`);

  // Obtener conteo por fecha
  const porFecha = await db.execute(sql`
    SELECT date, COUNT(*) as count 
    FROM cached_events 
    GROUP BY date 
    ORDER BY date ASC
  `);

  console.log("\n📅 Eventos por fecha:");
  porFecha.rows.forEach((row: any) => {
    console.log(`  ${row.date}: ${row.count} eventos`);
  });

  process.exit(0);
}

queryDB().catch(console.error);
