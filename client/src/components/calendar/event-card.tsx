import { type EconomicEvent, countries } from "@shared/schema";
import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { formatNumber } from "@/lib/format-numbers";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, TrendingUp } from "lucide-react";

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

const impactFires = {
  high: "🔥🔥🔥",
  medium: "🔥🔥",
  low: "🔥",
};

const impactLabels = {
  high: "Alta volatilidad esperada",
  medium: "Moderada volatilidad esperada",
  low: "Baja volatilidad esperada",
};

export function EventCard({ event, timezone, index }: EventCardProps) {
  const getCountryName = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode);
    return country?.name || countryCode;
  };

  const getCountryFlag = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode);
    return country?.flag || "";
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


  const impactIcons = {
    high: [ChevronUp, ChevronUp, ChevronUp],
    medium: [ChevronUp, ChevronUp],
    low: [ChevronUp],
  };

  const ImpactIcon = impactIcons[event.impact] || impactIcons.low;

  return (
    <div 
      className="flex gap-3 p-4 hover-elevate active-elevate-2 transition-colors border-b border-border last:border-b-0"
      data-testid={`card-event-${index}`}
    >
      {/* Time Column */}
      <div className="flex flex-col items-center min-w-[60px]">
        <span className="text-lg font-semibold font-mono text-foreground" data-testid={`text-time-${index}`}>
          {formatEventTime(event)}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {getCountryFlag(event.country)}
        </span>
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

      {/* Impact Indicator */}
      <div className="flex flex-col items-center justify-center gap-0.5" data-testid={`badge-impact-${index}`} title={impactLabels[event.impact]}>
        <span className="text-xl leading-none">
          {impactFires[event.impact]}
        </span>
      </div>
    </div>
  );
}
