import { 
  watchlistCountries, 
  watchlistEvents, 
  cachedEvents,
  type WatchlistCountry, 
  type WatchlistEvent, 
  type InsertWatchlistCountry, 
  type InsertWatchlistEvent,
  type CachedEvent,
  type InsertCachedEvent
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";

// Storage interface for the application
export interface IStorage {
  // Watchlist Countries
  getWatchlistCountries(sessionId: string): Promise<WatchlistCountry[]>;
  addWatchlistCountry(country: InsertWatchlistCountry): Promise<WatchlistCountry>;
  removeWatchlistCountry(sessionId: string, countryCode: string): Promise<void>;
  
  // Watchlist Events
  getWatchlistEvents(sessionId: string): Promise<WatchlistEvent[]>;
  addWatchlistEvent(event: InsertWatchlistEvent): Promise<WatchlistEvent>;
  removeWatchlistEvent(sessionId: string, eventId: string): Promise<void>;

  // Cached Events
  getCachedEvents(params: {
    startUtc?: Date;
    endUtc?: Date;
    fromDate?: string;
    toDate?: string;
    countries?: string[];
    impacts?: string[];
  }): Promise<CachedEvent[]>;
  saveCachedEvents(events: InsertCachedEvent[]): Promise<void>;
  getLatestCachedDate(): Promise<string | null>;
  deleteOldCachedEvents(daysToKeep: number): Promise<void>;
  clearCachedEvents(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Watchlist Countries
  async getWatchlistCountries(sessionId: string): Promise<WatchlistCountry[]> {
    return db.select().from(watchlistCountries).where(eq(watchlistCountries.sessionId, sessionId));
  }

  async addWatchlistCountry(country: InsertWatchlistCountry): Promise<WatchlistCountry> {
    const [result] = await db
      .insert(watchlistCountries)
      .values(country)
      .returning();
    return result;
  }

  async removeWatchlistCountry(sessionId: string, countryCode: string): Promise<void> {
    await db
      .delete(watchlistCountries)
      .where(
        and(
          eq(watchlistCountries.sessionId, sessionId),
          eq(watchlistCountries.countryCode, countryCode)
        )
      );
  }

  // Watchlist Events
  async getWatchlistEvents(sessionId: string): Promise<WatchlistEvent[]> {
    return db.select().from(watchlistEvents).where(eq(watchlistEvents.sessionId, sessionId));
  }

  async addWatchlistEvent(event: InsertWatchlistEvent): Promise<WatchlistEvent> {
    const [result] = await db
      .insert(watchlistEvents)
      .values(event)
      .returning();
    return result;
  }

  async removeWatchlistEvent(sessionId: string, eventId: string): Promise<void> {
    await db
      .delete(watchlistEvents)
      .where(
        and(
          eq(watchlistEvents.sessionId, sessionId),
          eq(watchlistEvents.eventId, eventId)
        )
      );
  }

  // Cached Events
  async getCachedEvents(params: {
    startUtc?: Date;
    endUtc?: Date;
    fromDate?: string;
    toDate?: string;
    countries?: string[];
    impacts?: string[];
  }): Promise<CachedEvent[]> {
    const conditions = [];

    // Always use date strings for filtering (timezone-safe)
    if (params.fromDate && params.toDate) {
      conditions.push(gte(cachedEvents.date, params.fromDate));
      conditions.push(lte(cachedEvents.date, params.toDate));
    }
    // Fallback to UTC timestamps if only those are provided
    else if (params.startUtc && params.endUtc) {
      conditions.push(gte(cachedEvents.eventTimestamp, params.startUtc));
      conditions.push(lte(cachedEvents.eventTimestamp, params.endUtc));
    }

    if (params.countries && params.countries.length > 0) {
      conditions.push(inArray(cachedEvents.country, params.countries));
    }

    if (params.impacts && params.impacts.length > 0) {
      conditions.push(inArray(cachedEvents.impact, params.impacts));
    }

    return db
      .select()
      .from(cachedEvents)
      .where(and(...conditions))
      .orderBy(cachedEvents.eventTimestamp);
  }

  async saveCachedEvents(events: InsertCachedEvent[]): Promise<void> {
    if (events.length === 0) return;

    // Deduplicate events by ID to prevent "ON CONFLICT affecting row twice" error
    const uniqueEvents = events.reduce((acc, event) => {
      acc.set(event.id, event);
      return acc;
    }, new Map<string, InsertCachedEvent>());
    
    const deduplicatedEvents = Array.from(uniqueEvents.values());

    // Bulk insert with ON CONFLICT DO UPDATE for performance
    // Process in batches of 100 to avoid overwhelming the database
    const batchSize = 100;
    
    for (let i = 0; i < deduplicatedEvents.length; i += batchSize) {
      const batch = deduplicatedEvents.slice(i, i + batchSize);
      
      await db
        .insert(cachedEvents)
        .values(batch)
        .onConflictDoUpdate({
          target: cachedEvents.id,
          set: {
            date: sql`EXCLUDED.date`,
            eventTimestamp: sql`EXCLUDED.event_timestamp`,
            actual: sql`EXCLUDED.actual`,
            forecast: sql`EXCLUDED.forecast`,
            previous: sql`EXCLUDED.previous`,
            category: sql`EXCLUDED.category`,
            fetchedAt: sql`NOW()`,
          },
        });
    }
  }

  async getLatestCachedDate(): Promise<string | null> {
    const result = await db
      .select({ maxDate: sql<string>`MAX(${cachedEvents.date})` })
      .from(cachedEvents);
    
    return result[0]?.maxDate || null;
  }

  async deleteOldCachedEvents(daysToKeep: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffString = cutoffDate.toISOString().split('T')[0];

    await db
      .delete(cachedEvents)
      .where(sql`${cachedEvents.date} < ${cutoffString}`);
  }

  async clearCachedEvents(): Promise<void> {
    await db.delete(cachedEvents);
  }
}

export const storage = new DatabaseStorage();
