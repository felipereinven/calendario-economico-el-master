import { z } from "zod";
import { pgTable, text, timestamp, serial, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Economic Event Schema
export const economicEventSchema = z.object({
  id: z.string(),
  eventTimestamp: z.string().or(z.date()), // Full UTC timestamp (converted from GMT+1)
  date: z.string(), // ISO date string
  time: z.string(), // Time in GMT+1 as scraped from Investing.com (original, not converted)
  country: z.string(), // Country code (e.g., "US", "EUR", "GB")
  countryName: z.string(), // Full country name
  event: z.string(), // Event name
  impact: z.enum(["high", "medium", "low"]), // Impact level
  actual: z.string().nullable(), // Actual value
  forecast: z.string().nullable(), // Forecast/consensus value
  previous: z.string().nullable(), // Previous value
  category: z.string().nullable().optional(), // Event category
});

export type EconomicEvent = z.infer<typeof economicEventSchema>;

// Economic categories
export const economicCategories = [
  { value: "employment", label: "Empleo", icon: "👥" },
  { value: "credit", label: "Crédito", icon: "💳" },
  { value: "balance", label: "Balance", icon: "⚖️" },
  { value: "economic-activity", label: "Actividad Económica", icon: "📊" },
  { value: "central-bank", label: "Banco Central", icon: "🏦" },
  { value: "bonds", label: "Bonos", icon: "📜" },
  { value: "inflation", label: "Inflación", icon: "📈" },
  { value: "confidence", label: "Índice de Confianza", icon: "😊" },
] as const;

export type EconomicCategory = typeof economicCategories[number]["value"];

// Filter options
export const filterOptionsSchema = z.object({
  countries: z.array(z.string()).optional(),
  impacts: z.array(z.enum(["high", "medium", "low"])).optional(),
  categories: z.array(z.string()).optional(),
  dateRange: z.enum(["yesterday", "today", "tomorrow", "thisWeek", "nextWeek", "thisMonth"]).optional(),
  timezone: z.string().optional(),
});

export type FilterOptions = z.infer<typeof filterOptionsSchema>;

// Country options for filters (8 principales economías)
export const countries = [
  { code: "USA", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "EUR", name: "Zona Euro", flag: "🇪🇺" },
  { code: "DEU", name: "Alemania", flag: "🇩🇪" },
  { code: "FRA", name: "Francia", flag: "🇫🇷" },
  { code: "ESP", name: "España", flag: "🇪🇸" },
  { code: "GBR", name: "Reino Unido", flag: "🇬🇧" },
  { code: "CHN", name: "China", flag: "🇨🇳" },
  { code: "JPN", name: "Japón", flag: "🇯🇵" },
] as const;

export type CountryOption = typeof countries[number];

// Database Tables
// Watchlist table for favorite countries
export const watchlistCountries = pgTable("watchlist_countries", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(), // User session identifier
  countryCode: text("country_code").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Watchlist table for favorite events
export const watchlistEvents = pgTable("watchlist_events", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(), // User session identifier
  eventId: text("event_id").notNull(),
  eventName: text("event_name").notNull(),
  country: text("country").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cached economic events table
export const cachedEvents = pgTable("cached_events", {
  id: text("id").primaryKey(), // Unique event ID from API
  eventTimestamp: timestamp("event_timestamp", { withTimezone: true, mode: 'date' }).notNull(), // Full UTC timestamp
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format (for compatibility)
  time: varchar("time", { length: 8 }).notNull(), // HH:MM:SS format (for compatibility)
  country: varchar("country", { length: 10 }).notNull(), // Country code
  countryName: text("country_name").notNull(), // Full country name
  event: text("event").notNull(), // Event name (Spanish)
  eventOriginal: text("event_original").notNull(), // Event name (English - for categorization)
  impact: varchar("impact", { length: 10 }).notNull(), // high, medium, low
  actual: text("actual"), // Actual value
  forecast: text("forecast"), // Forecast value
  previous: text("previous"), // Previous value
  category: varchar("category", { length: 50 }), // Event category (employment, inflation, etc.)
  fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(), // When this was fetched
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  timestampIdx: index("cached_events_timestamp_idx").on(table.eventTimestamp),
  dateCountryImpactIdx: index("cached_events_date_country_impact_idx").on(table.date, table.country, table.impact),
  dateImpactIdx: index("cached_events_date_impact_idx").on(table.date, table.impact),
  fetchedAtIdx: index("cached_events_fetched_at_idx").on(table.fetchedAt),
}));

// Zod schemas for insertions
export const insertWatchlistCountrySchema = createInsertSchema(watchlistCountries).omit({
  id: true,
  createdAt: true,
});

export const insertWatchlistEventSchema = createInsertSchema(watchlistEvents).omit({
  id: true,
  createdAt: true,
});

export const insertCachedEventSchema = createInsertSchema(cachedEvents).omit({
  fetchedAt: true,
  createdAt: true,
}).extend({
  eventTimestamp: z.date(), // Ensure timestamp is a Date object
});

// Types
export type WatchlistCountry = typeof watchlistCountries.$inferSelect;
export type InsertWatchlistCountry = z.infer<typeof insertWatchlistCountrySchema>;
export type WatchlistEvent = typeof watchlistEvents.$inferSelect;
export type InsertWatchlistEvent = z.infer<typeof insertWatchlistEventSchema>;
export type CachedEvent = typeof cachedEvents.$inferSelect;
export type InsertCachedEvent = z.infer<typeof insertCachedEventSchema>;
