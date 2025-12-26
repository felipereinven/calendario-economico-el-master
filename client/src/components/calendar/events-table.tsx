import { useState, useEffect } from "react";
import { type EconomicEvent, countries } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { formatNumber } from "@/lib/format-numbers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Bell, BellOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";
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

const impactLabels = {
  high: "Alta volatilidad esperada",
  medium: "Moderada volatilidad esperada",
  low: "Baja volatilidad esperada",
};

const ImpactFires = ({ level }: { level: "high" | "medium" | "low" }) => {
  const activeCount = level === "high" ? 3 : level === "medium" ? 2 : 1;
  
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={i <= activeCount ? "text-xl" : "text-xl opacity-25 grayscale"}
        >
          🔥
        </span>
      ))}
    </div>
  );
};

// Componente para el botón de notificaciones en la tabla
function NotificationButton({ event }: { event: EconomicEvent }) {
  const queryClient = useQueryClient();
  const sessionId = getSessionId();

  // Fetch notifications for this event
  const { data: notifications = [] } = useQuery({
    queryKey: [`/api/notifications/${event.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/notifications/${event.id}`, {
        headers: { 'x-session-id': sessionId },
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
  });

  // Add notification mutation
  const addNotification = useMutation({
    mutationFn: async (minutesBefore: number) => {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          eventId: event.id,
          eventTimestamp: typeof event.eventTimestamp === 'string' 
            ? event.eventTimestamp 
            : event.eventTimestamp.toISOString(),
          minutesBefore,
        }),
      });
      if (!response.ok) throw new Error('Failed to add notification');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/notifications/${event.id}`] });
    },
  });

  // Remove notification mutation
  const removeNotification = useMutation({
    mutationFn: async (minutesBefore: number) => {
      const response = await fetch(`/api/notifications/${event.id}/${minutesBefore}`, {
        method: 'DELETE',
        headers: { 'x-session-id': sessionId },
      });
      if (!response.ok) throw new Error('Failed to remove notification');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/notifications/${event.id}`] });
    },
  });

  const hasNotification = (minutes: number) => 
    notifications.some((n: any) => n.minutesBefore === minutes);

  const toggleNotification = (minutes: number) => {
    if (hasNotification(minutes)) {
      removeNotification.mutate(minutes);
    } else {
      addNotification.mutate(minutes);
    }
  };

  const hasAnyNotification = notifications.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Configurar notificaciones"
        >
          {hasAnyNotification ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-[200]">
        <DropdownMenuLabel>Recordatorios</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => toggleNotification(15)}
          className="cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span>15 minutos antes</span>
            {hasNotification(15) && <Bell className="h-4 w-4 text-primary" />}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => toggleNotification(30)}
          className="cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span>30 minutos antes</span>
            {hasNotification(30) && <Bell className="h-4 w-4 text-primary" />}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => toggleNotification(60)}
          className="cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span>60 minutos antes</span>
            {hasNotification(60) && <Bell className="h-4 w-4 text-primary" />}
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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

  const formatEventDateTime = (event: EconomicEvent) => {
    try {
      let dateTime: Date;
      
      // Si tenemos eventTimestamp, usarlo directamente
      if (event.eventTimestamp) {
        dateTime = typeof event.eventTimestamp === 'string' 
          ? parseISO(event.eventTimestamp) 
          : event.eventTimestamp;
      } else {
        // Fallback: construir desde date + time
        const timeParts = event.time.split(':');
        const fullTime = timeParts.length === 2 
          ? `${timeParts[0]}:${timeParts[1]}:00`
          : event.time;
        
        dateTime = parseISO(`${event.date}T${fullTime}Z`);
      }
      
      return {
        date: formatInTimeZone(dateTime, timezone, "MMM dd, yyyy"),
        time: formatInTimeZone(dateTime, timezone, "HH:mm"),
        fullDateTime: dateTime,
      };
    } catch (err) {
      console.error('Format error:', { event, err });
      return { 
        date: event.date, 
        time: event.time,
        fullDateTime: new Date(),
      };
    }
  };

  const translateImpact = (impact: string) => {
    const translations: Record<string, string> = {
      high: "Alta",
      medium: "Media",
      low: "Baja",
    };
    return translations[impact] || impact;
  };

  const getActualColor = (actual: string | null, previous: string | null) => {
    if (!actual || !previous) return "text-foreground";
    
    const actualNum = parseFloat(actual.replace(/[^0-9.-]/g, ""));
    const previousNum = parseFloat(previous.replace(/[^0-9.-]/g, ""));
    
    if (isNaN(actualNum) || isNaN(previousNum)) return "text-foreground";
    
    if (actualNum > previousNum) return "text-green-600 font-semibold";
    if (actualNum < previousNum) return "text-red-600 font-semibold";
    return "text-foreground";
  };

  // Ordenar eventos por hora
  const sortedEvents = [...events].sort((a, b) => {
    const dateTimeA = a.eventTimestamp ? new Date(a.eventTimestamp) : new Date(`${a.date}T${a.time}Z`);
    const dateTimeB = b.eventTimestamp ? new Date(b.eventTimestamp) : new Date(`${b.date}T${b.time}Z`);
    return dateTimeA.getTime() - dateTimeB.getTime();
  });

  // Paginación con eventos ordenados
  const totalPages = Math.ceil(sortedEvents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedEvents = sortedEvents.slice(startIndex, endIndex);

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
                Actual
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
              <th
                scope="col"
                className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider w-[80px]"
              >
                Notif.
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {paginatedEvents.map((event, index) => {
              const { date, time } = formatEventDateTime(event);
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
                      <CountryFlag countryCode={event.country} className="w-6 h-4 rounded-sm" />
                      <span className="text-sm text-foreground font-medium">{getCountryName(event.country)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-foreground" data-testid={`text-event-${index}`}>
                    <div className="max-w-md">{event.event}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center" data-testid={`badge-impact-${index}`}>
                    <div className="flex items-center justify-center">
                      <div 
                        className="cursor-help" 
                        title={impactLabels[event.impact]}
                      >
                        <ImpactFires level={event.impact} />
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 py-4 whitespace-nowrap text-sm font-mono text-right ${getActualColor(event.actual, event.previous)}`} data-testid={`text-actual-${index}`}>
                    {formatNumber(event.actual)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-right text-muted-foreground" data-testid={`text-forecast-${index}`}>
                    {formatNumber(event.forecast)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-right text-muted-foreground" data-testid={`text-previous-${index}`}>
                    {formatNumber(event.previous)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <NotificationButton event={event} />
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
        <div className="flex flex-col gap-3 mt-4 px-4 sm:px-0">
          {/* Fila 1: Info de resultados y selector de página (solo desktop) */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Mostrando</span>
              <span className="font-medium text-foreground">
                {startIndex + 1}-{Math.min(endIndex, events.length)}
              </span>
              <span>de</span>
              <span className="font-medium text-foreground">{events.length}</span>
              <span>eventos</span>
            </div>

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
          </div>

          {/* Fila 2: Navegación (mobile y desktop) */}
          <div className="flex items-center justify-between">
            {/* Info compacta para móvil */}
            <div className="flex items-center gap-1.5 text-sm sm:hidden">
              <span className="text-muted-foreground">{startIndex + 1}-{Math.min(endIndex, events.length)}</span>
              <span className="text-muted-foreground/60">de</span>
              <span className="font-medium text-foreground">{events.length}</span>
            </div>

            {/* Spacer para desktop */}
            <div className="hidden sm:block"></div>

            {/* Controles de navegación */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                data-testid="button-previous-page"
                className="h-9"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Anterior</span>
              </Button>
              
              <div className="flex items-center gap-1.5 px-2 min-w-[80px] justify-center">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Pág.</span>
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  {currentPage}/{totalPages}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
                className="h-9"
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
