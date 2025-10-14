import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type EconomicEvent, type FilterOptions, countries } from "@shared/schema";
import { FilterControls } from "@/components/calendar/filter-controls";
import { EventsTable } from "@/components/calendar/events-table";
import { TimezoneSelector } from "@/components/calendar/timezone-selector";
import { Loader2 } from "lucide-react";

export default function CalendarPage() {
  const [filters, setFilters] = useState<FilterOptions>({
    countries: [],
    impacts: [],
    dateRange: "today",
    search: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

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

  const { data: events, isLoading, error } = useQuery<EconomicEvent[]>({
    queryKey: [apiUrl],
  });

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-[100] border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-semibold text-foreground">
            Global Economic Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time economic events and market indicators across 196 countries
          </p>
        </div>
      </header>

      {/* Filter Controls */}
      <div className="sticky top-[89px] z-[99] border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <FilterControls filters={filters} onFilterChange={handleFilterChange} />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24" data-testid="loading-state">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading economic events...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24" data-testid="error-state">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-foreground font-medium mb-1">Failed to load events</p>
            <p className="text-sm text-muted-foreground">Please try again later</p>
          </div>
        ) : events && events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24" data-testid="empty-state">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-foreground font-medium mb-1">No events found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
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
