import { type EconomicEvent, countries } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Badge } from "@/components/ui/badge";

interface EventsTableProps {
  events: EconomicEvent[];
  timezone: string;
}

const impactColors = {
  high: "bg-impact-high/20 text-impact-high border-impact-high/30",
  medium: "bg-impact-medium/20 text-impact-medium border-impact-medium/30",
  low: "bg-impact-low/20 text-impact-low border-impact-low/30",
};

const impactDots = {
  high: "bg-impact-high",
  medium: "bg-impact-medium",
  low: "bg-impact-low",
};

export function EventsTable({ events, timezone }: EventsTableProps) {
  const getCountryName = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode);
    return country?.name || countryCode;
  };

  const formatEventDateTime = (dateStr: string, timeStr: string) => {
    try {
      // Combine date and time - API provides times in their local market timezone
      // We convert to the user's selected timezone for display
      const dateTime = parseISO(`${dateStr}T${timeStr}`);
      return {
        date: formatInTimeZone(dateTime, timezone, "MMM dd, yyyy"),
        time: formatInTimeZone(dateTime, timezone, "HH:mm"),
      };
    } catch {
      return { date: dateStr, time: timeStr };
    }
  };

  const formatValue = (value: string | null) => {
    if (!value || value === "N/A" || value === "") return "—";
    return value;
  };

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full divide-y divide-border" data-testid="table-events">
          <thead className="bg-muted/50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Date
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Time
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Country
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Event
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Impact
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Actual
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Forecast
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Previous
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {events.map((event, index) => {
              const { date, time } = formatEventDateTime(event.date, event.time);
              return (
                <tr
                  key={event.id}
                  className="hover-elevate transition-colors"
                  data-testid={`row-event-${index}`}
                >
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground" data-testid={`text-date-${index}`}>
                    {date}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-foreground" data-testid={`text-time-${index}`}>
                    {time}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap" data-testid={`text-country-${index}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-foreground font-medium">{event.country}</span>
                      <span className="text-xs text-muted-foreground">{getCountryName(event.country)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-foreground" data-testid={`text-event-${index}`}>
                    <div className="max-w-md">{event.event}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center" data-testid={`badge-impact-${index}`}>
                    <Badge
                      variant="outline"
                      className={`${impactColors[event.impact]} gap-1.5 capitalize`}
                    >
                      <span className={`w-2 h-2 rounded-full ${impactDots[event.impact]}`} />
                      {event.impact}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-right text-foreground" data-testid={`text-actual-${index}`}>
                    {formatValue(event.actual)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-right text-muted-foreground" data-testid={`text-forecast-${index}`}>
                    {formatValue(event.forecast)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-right text-muted-foreground" data-testid={`text-previous-${index}`}>
                    {formatValue(event.previous)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
