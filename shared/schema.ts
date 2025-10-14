import { z } from "zod";
import { pgTable, text, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Economic Event Schema
export const economicEventSchema = z.object({
  id: z.string(),
  date: z.string(), // ISO date string
  time: z.string(), // Time in UTC
  country: z.string(), // Country code (e.g., "US", "EUR", "GB")
  countryName: z.string(), // Full country name
  event: z.string(), // Event name
  impact: z.enum(["high", "medium", "low"]), // Impact level
  actual: z.string().nullable(), // Actual value
  forecast: z.string().nullable(), // Forecast/consensus value
  previous: z.string().nullable(), // Previous value
});

export type EconomicEvent = z.infer<typeof economicEventSchema>;

// Economic categories
export const economicCategories = [
  { value: "employment", label: "Empleo", icon: "👥" },
  { value: "inflation", label: "Inflación", icon: "📈" },
  { value: "monetary", label: "Política Monetaria", icon: "🏛️" },
  { value: "manufacturing", label: "Manufactura", icon: "🏭" },
  { value: "services", label: "Servicios", icon: "🔔" },
  { value: "energy", label: "Energía", icon: "⚡" },
  { value: "confidence", label: "Confianza del Consumidor", icon: "😊" },
] as const;

export type EconomicCategory = typeof economicCategories[number]["value"];

// Filter options
export const filterOptionsSchema = z.object({
  countries: z.array(z.string()).optional(),
  impacts: z.array(z.enum(["high", "medium", "low"])).optional(),
  categories: z.array(z.string()).optional(),
  dateRange: z.enum(["today", "thisWeek", "nextWeek", "thisMonth"]).optional(),
  search: z.string().optional(),
  timezone: z.string().optional(),
});

export type FilterOptions = z.infer<typeof filterOptionsSchema>;

// Country options for filters
export const countries = [
  { code: "USA", name: "Estados Unidos" },
  { code: "EUR", name: "Zona Euro" },
  { code: "DEU", name: "Alemania" },
  { code: "FRA", name: "Francia" },
  { code: "ESP", name: "España" },
  { code: "GBR", name: "Reino Unido" },
  { code: "CAD", name: "Canadá" },
  { code: "JPN", name: "Japón" },
  { code: "CHN", name: "China" },
  { code: "IND", name: "India" },
  { code: "BRA", name: "Brasil" },
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

// Zod schemas for insertions
export const insertWatchlistCountrySchema = createInsertSchema(watchlistCountries).omit({
  id: true,
  createdAt: true,
});

export const insertWatchlistEventSchema = createInsertSchema(watchlistEvents).omit({
  id: true,
  createdAt: true,
});

// Types
export type WatchlistCountry = typeof watchlistCountries.$inferSelect;
export type InsertWatchlistCountry = z.infer<typeof insertWatchlistCountrySchema>;
export type WatchlistEvent = typeof watchlistEvents.$inferSelect;
export type InsertWatchlistEvent = z.infer<typeof insertWatchlistEventSchema>;
