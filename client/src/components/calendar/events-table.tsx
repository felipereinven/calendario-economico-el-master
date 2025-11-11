import { useState, useEffect } from "react";
import { type EconomicEvent, countries } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { EventCard } from "./event-card";

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
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  // Smaller page size for mobile for better UX
  const [pageSize, setPageSize] = useState(20);

  // Sync page size with mobile/desktop breakpoint
  useEffect(() => {
    setPageSize(isMobile ? 15 : 20);
    setCurrentPage(1); // Reset to page 1 when breakpoint changes
  }, [isMobile]);

  // Resetear a página 1 cuando cambian los eventos (por filtros)
  useEffect(() => {
    setCurrentPage(1);
  }, [events.length]);

  const getCountryName = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode);
    return country?.name || countryCode;
  };

  const getCountryFlag = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode);
    return country?.flag || "";
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

  const translateImpact = (impact: string) => {
    const translations: Record<string, string> = {
      high: "Alta",
      medium: "Media",
      low: "Baja",
    };
    return translations[impact] || impact;
  };

  // Paginación
  const totalPages = Math.ceil(events.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedEvents = events.slice(startIndex, endIndex);

  // Resetear a página 1 cuando cambian los eventos o el tamaño de página
  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize));
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  return (
    <div>
      {/* Mobile View - Cards */}
      {isMobile ? (
        <div className="divide-y divide-border border-y border-border -mx-4" data-testid="list-events-mobile">
          {paginatedEvents.map((event, index) => (
            <EventCard 
              key={event.id}
              event={event}
              timezone={timezone}
              index={index}
            />
          ))}
        </div>
      ) : (
        /* Desktop View - Table */
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-border" data-testid="table-events">
          <thead className="bg-muted/50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Fecha
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Hora
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                País
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Evento
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Impacto
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Real
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Pronóstico
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-foreground uppercase tracking-wider"
              >
                Anterior
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {paginatedEvents.map((event, index) => {
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
                      <span className="text-lg">{getCountryFlag(event.country)}</span>
                      <span className="text-sm text-foreground font-medium">{getCountryName(event.country)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-foreground" data-testid={`text-event-${index}`}>
                    <div className="max-w-md">{event.event}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center" data-testid={`badge-impact-${index}`}>
                    <Badge
                      variant="outline"
                      className={`${impactColors[event.impact]} gap-1.5`}
                    >
                      <span className={`w-2 h-2 rounded-full ${impactDots[event.impact]}`} />
                      {translateImpact(event.impact)}
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
      )}

      {/* Controles de paginación */}
      {events.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-4 sm:px-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mostrando</span>
            <span className="font-medium text-foreground">
              {startIndex + 1}-{Math.min(endIndex, events.length)}
            </span>
            <span>de</span>
            <span className="font-medium text-foreground">{events.length}</span>
            <span>eventos</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Por página:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[80px]" data-testid="select-page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[300]">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                data-testid="button-previous-page"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Anterior</span>
              </Button>
              
              <div className="flex items-center gap-2 px-2">
                <span className="text-sm text-muted-foreground">Página</span>
                <span className="text-sm font-medium text-foreground">
                  {currentPage} de {totalPages}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                <span className="hidden sm:inline mr-1">Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
