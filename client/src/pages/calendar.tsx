import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type EconomicEvent, type FilterOptions, countries } from "@shared/schema";
import { FilterControls } from "@/components/calendar/filter-controls";
import { EventsTable } from "@/components/calendar/events-table";
import { TimezoneSelector } from "@/components/calendar/timezone-selector";
import { NotificationSettings } from "@/components/calendar/notification-settings";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function CalendarPage() {
  const [filters, setFilters] = useState<FilterOptions>({
    countries: [],
    impacts: [],
    dateRange: "today",
    search: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  
  const [refreshInterval, setRefreshInterval] = useState<number>(0); // 0 = disabled
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationImpactLevels, setNotificationImpactLevels] = useState<("high" | "medium" | "low")[]>(["high"]);

  // Build query string from filters
  const queryParams = new URLSearchParams();
  if (filters.countries && filters.countries.length > 0) {
    queryParams.set("countries", filters.countries.join(","));
  }
  if (filters.impacts && filters.impacts.length > 0) {
    queryParams.set("impacts", filters.impacts.join(","));
  }
  if (filters.dateRange) {
    queryParams.set("dateRange", filters.dateRange);
  }
  if (filters.search) {
    queryParams.set("search", filters.search);
  }
  if (filters.timezone) {
    queryParams.set("timezone", filters.timezone);
  }

  const queryString = queryParams.toString();
  const apiUrl = `/api/events${queryString ? `?${queryString}` : ""}`;

  const { data: events, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery<EconomicEvent[]>({
    queryKey: [apiUrl],
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
  });
  
  // Update last updated timestamp when data is fetched (including refetches)
  useEffect(() => {
    if (dataUpdatedAt && !isLoading) {
      setLastUpdated(new Date(dataUpdatedAt));
    }
  }, [dataUpdatedAt, isLoading]);
  
  // Notification system
  const { newEventCount, clearNotificationBadge } = useNotifications(events, {
    enabled: notificationsEnabled,
    impactLevels: notificationImpactLevels,
  });

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-[100] border-b bg-card/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  El Master - Calendario Económico Global
                </h1>
                <p className="text-xs text-muted-foreground">
                  {events ? `${events.length} eventos` : "0 eventos"} • {countries.length} países • {filters.timezone?.split('/').pop() || 'UTC'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Status Indicators */}
              <div className="flex gap-1 mr-2">
                <div className="px-2 py-1 rounded-md bg-impact-high/20 text-impact-high text-xs font-semibold">
                  Alta: {events?.filter(e => e.impact === 'high').length || 0}
                </div>
                <div className="px-2 py-1 rounded-md bg-impact-medium/20 text-impact-medium text-xs font-semibold">
                  Media: {events?.filter(e => e.impact === 'medium').length || 0}
                </div>
                <div className="px-2 py-1 rounded-md bg-impact-low/20 text-impact-low text-xs font-semibold">
                  Baja: {events?.filter(e => e.impact === 'low').length || 0}
                </div>
              </div>

              {/* Notification Settings */}
              <NotificationSettings
                enabled={notificationsEnabled}
                onToggle={setNotificationsEnabled}
                impactLevels={notificationImpactLevels}
                onImpactLevelsChange={setNotificationImpactLevels}
                newEventCount={newEventCount}
                onClearBadge={clearNotificationBadge}
              />
              
              {/* Manual Refresh Button */}
              <Button
                variant="default"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                data-testid="button-refresh"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner if API fails */}
      {error && (
        <div className="bg-destructive/20 border-l-4 border-destructive px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <svg className="w-5 h-5 text-destructive-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-destructive-foreground">
              Error al cargar los datos económicos desde Finnworlds API. Verifica la conexión. Los datos pueden no estar actualizados.
            </p>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="sticky top-[89px] z-[99] border-b bg-muted/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Centro de Control - Filtros Avanzados
          </h2>
          <FilterControls filters={filters} onFilterChange={handleFilterChange} />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24" data-testid="loading-state">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Cargando eventos económicos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24" data-testid="error-state">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-base text-foreground font-semibold mb-2">No se encontraron eventos</p>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Intenta ajustar los filtros para ver más eventos económicos. 
              <br/>
              Mostrando 0 de 0 eventos disponibles
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-retry"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Intentar de nuevo
            </Button>
          </div>
        ) : events && events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24" data-testid="empty-state">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-base text-foreground font-semibold mb-2">No se encontraron eventos</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Intenta ajustar los filtros para ver más eventos económicos
            </p>
          </div>
        ) : (
          <EventsTable events={events || []} timezone={filters.timezone || "UTC"} />
        )}
      </main>

      {/* Timezone Selector FAB */}
      <TimezoneSelector 
        selectedTimezone={filters.timezone || "UTC"} 
        onTimezoneChange={(tz) => handleFilterChange({ timezone: tz })} 
      />
    </div>
  );
}
