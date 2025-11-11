import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export interface DateRange {
  startUtc: Date;
  endUtc: Date;
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  localLabel: string;
}

/**
 * Calculate date range based on period and timezone
 * @param period - "today" | "thisWeek" | "nextWeek" | "thisMonth"
 * @param timezone - IANA timezone string (default: "UTC")
 * @returns DateRange with UTC timestamps and date strings
 */
export function calculateDateRange(
  period: "today" | "thisWeek" | "nextWeek" | "thisMonth" = "today",
  timezone: string = "UTC"
): DateRange {
  // Get current time in the specified timezone
  const nowUtc = new Date();
  const nowInZone = toZonedTime(nowUtc, timezone);

  let startLocal: Date;
  let endLocal: Date;
  let localLabel: string;

  switch (period) {
    case "today":
      startLocal = startOfDay(nowInZone);
      endLocal = endOfDay(nowInZone);
      localLabel = `Hoy (${format(nowInZone, "dd/MM/yyyy")})`;
      break;

    case "thisWeek":
      // Monday to Sunday
      startLocal = startOfWeek(nowInZone, { weekStartsOn: 1 });
      endLocal = endOfWeek(nowInZone, { weekStartsOn: 1 });
      localLabel = `Esta Semana (${format(startLocal, "dd/MM")} - ${format(endLocal, "dd/MM")})`;
      break;

    case "nextWeek":
      const nextWeekStart = addWeeks(startOfWeek(nowInZone, { weekStartsOn: 1 }), 1);
      startLocal = nextWeekStart;
      endLocal = endOfWeek(nextWeekStart, { weekStartsOn: 1 });
      localLabel = `Próxima Semana (${format(startLocal, "dd/MM")} - ${format(endLocal, "dd/MM")})`;
      break;

    case "thisMonth":
      startLocal = startOfMonth(nowInZone);
      endLocal = endOfMonth(nowInZone);
      localLabel = `Este Mes (${format(nowInZone, "MMMM yyyy")})`;
      break;

    default:
      startLocal = startOfDay(nowInZone);
      endLocal = endOfDay(nowInZone);
      localLabel = `Hoy`;
  }

  // Convert back to UTC for timestamp filtering
  const startUtc = fromZonedTime(startLocal, timezone);
  const endUtc = fromZonedTime(endLocal, timezone);

  // IMPORTANT: Use date strings from local time to avoid timezone issues
  // This ensures "today" in NY shows only events with date="2025-11-11",
  // not events from "2025-11-12" that happen to fall within the UTC range
  const startDate = format(startLocal, "yyyy-MM-dd");
  const endDate = format(endLocal, "yyyy-MM-dd");

  return {
    startUtc,
    endUtc,
    startDate,
    endDate,
    localLabel,
  };
}

/**
 * Get date range for background refresh jobs
 * @param days - Number of days forward from today
 * @returns DateRange for job execution
 */
export function getRefreshRange(days: number): DateRange {
  const now = new Date();
  const start = startOfDay(now);
  const end = new Date(now);
  end.setDate(end.getDate() + days);

  return {
    startUtc: start,
    endUtc: endOfDay(end),
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
    localLabel: `${days} days forward`,
  };
}
