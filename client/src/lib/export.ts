import { EconomicEvent } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export function exportToCSV(events: EconomicEvent[], timezone: string) {
  // Define CSV headers
  const headers = [
    "Date",
    "Time",
    "Country",
    "Event",
    "Impact",
    "Actual",
    "Forecast",
    "Previous",
  ];

  // Convert events to CSV rows
  const rows = events.map((event) => {
    try {
      // Parse the event datetime and format in user's selected timezone
      // This matches the display logic in EventsTable
      const dateTimeString = `${event.date}T${event.time || "00:00:00"}`;
      const eventDateTime = parseISO(dateTimeString);
      
      const date = formatInTimeZone(eventDateTime, timezone, "yyyy-MM-dd");
      const time = formatInTimeZone(eventDateTime, timezone, "HH:mm");

      return [
        date,
        time,
        event.country,
        event.event,
        event.impact.toUpperCase(),
        event.actual || "",
        event.forecast || "",
        event.previous || "",
      ];
    } catch {
      // Fallback to raw values if parsing fails
      return [
        event.date,
        event.time ? event.time.substring(0, 5) : "00:00",
        event.country,
        event.event,
        event.impact.toUpperCase(),
        event.actual || "",
        event.forecast || "",
        event.previous || "",
      ];
    }
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => {
        // Escape cells containing commas, quotes, or newlines
        const cellStr = String(cell);
        if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(",")
    ),
  ].join("\n");

  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
  link.setAttribute("href", url);
  link.setAttribute("download", `economic-calendar-${timestamp}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
