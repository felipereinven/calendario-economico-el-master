import { watchlistCountries, watchlistEvents, type WatchlistCountry, type WatchlistEvent, type InsertWatchlistCountry, type InsertWatchlistEvent } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
