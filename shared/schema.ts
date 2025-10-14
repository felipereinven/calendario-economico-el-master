import { z } from "zod";

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

// Filter options
export const filterOptionsSchema = z.object({
  countries: z.array(z.string()).optional(),
  impacts: z.array(z.enum(["high", "medium", "low"])).optional(),
  dateRange: z.enum(["today", "thisWeek", "nextWeek", "thisMonth"]).optional(),
  search: z.string().optional(),
  timezone: z.string().optional(),
});

export type FilterOptions = z.infer<typeof filterOptionsSchema>;

// Country options for filters
export const countries = [
  { code: "USD", name: "United States" },
  { code: "EUR", name: "Eurozone" },
  { code: "GBP", name: "United Kingdom" },
  { code: "JPY", name: "Japan" },
  { code: "CNY", name: "China" },
  { code: "AUD", name: "Australia" },
  { code: "CAD", name: "Canada" },
  { code: "CHF", name: "Switzerland" },
  { code: "NZD", name: "New Zealand" },
] as const;

export type CountryOption = typeof countries[number];
