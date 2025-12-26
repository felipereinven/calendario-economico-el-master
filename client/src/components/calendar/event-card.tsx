import { type EconomicEvent, countries } from "@shared/schema";
import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { formatNumber } from "@/lib/format-numbers";
import { Badge } from "@/components/ui/badge";
import { CountryFlag } from "@/components/ui/country-flag";
import { ChevronDown, ChevronUp, TrendingUp, Bell, BellOff, Info } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSessionId } from "@/lib/session";

interface EventCardProps {
  event: EconomicEvent;
  timezone: string;
  index: number;
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

export function EventCard({ event, timezone, index }: EventCardProps) {
  const queryClient = useQueryClient();
  const sessionId = getSessionId();
  const [showDetails, setShowDetails] = useState(false);

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

  const getCountryName = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode);
    return country?.name || countryCode;
  };

  const formatEventTime = (event: EconomicEvent) => {
    try {
      let dateTime: Date;
      
      if (event.eventTimestamp) {
        // Use the full timestamp if available
        dateTime = typeof event.eventTimestamp === 'string' 
          ? parseISO(event.eventTimestamp) 
          : event.eventTimestamp;
      } else {
        // Fallback to constructing from date and time
        const timeParts = event.time.split(':');
        const fullTime = timeParts.length === 2 
          ? `${timeParts[0]}:${timeParts[1]}:00`
          : event.time;
        dateTime = parseISO(`${event.date}T${fullTime}Z`);
      }
      
      return formatInTimeZone(dateTime, timezone, "HH:mm");
    } catch (err) {
      console.error('Format error:', err);
      return event.time;
    }
  };

  const formatEventDate = (event: EconomicEvent) => {
    try {
      let dateTime: Date;
      
      if (event.eventTimestamp) {
        dateTime = typeof event.eventTimestamp === 'string' 
          ? parseISO(event.eventTimestamp) 
          : event.eventTimestamp;
      } else {
        const timeParts = event.time.split(':');
        const fullTime = timeParts.length === 2 
          ? `${timeParts[0]}:${timeParts[1]}:00`
          : event.time;
        dateTime = parseISO(`${event.date}T${fullTime}Z`);
      }
      
      return formatInTimeZone(dateTime, timezone, "dd MMM", { locale: es });
    } catch (err) {
      console.error('Format error:', err);
      return event.date;
    }
  };


  const impactIcons = {
    high: [ChevronUp, ChevronUp, ChevronUp],
    medium: [ChevronUp, ChevronUp],
    low: [ChevronUp],
  };

  const ImpactIcon = impactIcons[event.impact] || impactIcons.low;

  return (
    <>
    <div 
      className="flex gap-3 p-4 hover-elevate active-elevate-2 transition-colors border-b border-border last:border-b-0 cursor-pointer"
      data-testid={`card-event-${index}`}
      onClick={() => setShowDetails(true)}
    >
      {/* Date & Time Column */}
      <div className="flex flex-col items-center min-w-[70px]">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {formatEventDate(event)}
        </span>
        <span className="text-lg font-semibold font-mono text-foreground" data-testid={`text-time-${index}`}>
          {formatEventTime(event)}
        </span>
        <div className="mt-1">
          <CountryFlag countryCode={event.country} className="w-8 h-5 rounded-sm" />
        </div>
      </div>

      {/* Event Details Column */}
      <div className="flex-1 min-w-0">
        {/* Country */}
        <div className="flex items-center gap-2 mb-1" data-testid={`text-country-${index}`}>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {getCountryName(event.country)}
          </span>
        </div>

        {/* Event Name - Clamped to 2 lines on small screens */}
        <h3 className="text-sm font-medium text-foreground leading-snug mb-2 line-clamp-2" data-testid={`text-event-${index}`}>
          {event.event}
        </h3>

        {/* Data Row */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Real:</span>
            <span className={`font-semibold ${event.actual ? 'text-foreground' : 'text-muted-foreground'}`} data-testid={`text-actual-${index}`}>
              {formatNumber(event.actual)}
            </span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Pron:</span>
            <span className="text-muted-foreground" data-testid={`text-forecast-${index}`}>
              {formatNumber(event.forecast)}
            </span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Ant:</span>
            <span className="text-muted-foreground" data-testid={`text-previous-${index}`}>
              {formatNumber(event.previous)}
            </span>
          </div>
        </div>
      </div>

      {/* Notification & Impact Column */}
      <div className="flex flex-col items-end justify-start gap-1" onClick={(e) => e.stopPropagation()}>
        {/* Notification Button */}
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
          <DropdownMenuContent align="end" className="w-56">
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

        {/* Impact Indicator */}
        <div className="flex flex-col items-center justify-center" data-testid={`badge-impact-${index}`} title={impactLabels[event.impact]}>
          <ImpactFires level={event.impact} />
        </div>
      </div>
    </div>

    {/* Sheet with full event details */}
    <Sheet open={showDetails} onOpenChange={setShowDetails}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto z-[300]">
        <SheetHeader>
          <SheetTitle className="text-left">Detalles del Evento</SheetTitle>
          <SheetDescription className="text-left">
            Información completa del evento económico
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Event Title */}
          <div>
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Evento</div>
            <div className="text-base font-medium text-foreground leading-relaxed">{event.event}</div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Fecha</div>
              <div className="text-sm font-medium text-foreground">{formatEventDate(event)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Hora</div>
              <div className="text-sm font-medium font-mono text-foreground">{formatEventTime(event)}</div>
            </div>
          </div>

          {/* Country */}
          <div>
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">País</div>
            <div className="flex items-center gap-2">
              <CountryFlag countryCode={event.country} className="w-8 h-5 rounded-sm" />
              <span className="text-sm font-medium text-foreground">{getCountryName(event.country)}</span>
            </div>
          </div>

          {/* Impact */}
          <div>
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Impacto</div>
            <div className="flex items-center gap-2">
              <ImpactFires level={event.impact} />
              <span className="text-sm text-foreground">{impactLabels[event.impact]}</span>
            </div>
          </div>

          {/* Economic Data */}
          <div>
            <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Datos Económicos</div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card/50 p-3 rounded-lg border border-border">
                <div className="text-xs text-muted-foreground mb-1">Real</div>
                <div className={`text-base font-semibold font-mono ${event.actual ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {formatNumber(event.actual)}
                </div>
              </div>
              <div className="bg-card/50 p-3 rounded-lg border border-border">
                <div className="text-xs text-muted-foreground mb-1">Pronóstico</div>
                <div className="text-base font-semibold font-mono text-foreground">
                  {formatNumber(event.forecast)}
                </div>
              </div>
              <div className="bg-card/50 p-3 rounded-lg border border-border">
                <div className="text-xs text-muted-foreground mb-1">Anterior</div>
                <div className="text-base font-semibold font-mono text-foreground">
                  {formatNumber(event.previous)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}
