# Global Economic Calendar

A professional web application for tracking real-time global economic events and market indicators across 196 countries. Built with modern web technologies and featuring advanced filtering, timezone management, and a clean, responsive interface inspired by Investing.com.

## Overview

This application serves as an interactive Global Economic Calendar that displays financial events with comprehensive filtering capabilities. Users can filter by country, impact level, time period, and search for specific events. The application automatically detects the user's timezone and allows manual timezone selection for personalized event time display.

## Recent Changes

- **October 14, 2025** (Update 2): ✅ Dark Mode + Mobile Responsiveness
  - **Dark Mode**: Activado por defecto para toda la aplicación
  - **Responsividad Móvil Completa**:
    - Header responsive con tamaños adaptativos (flex-col en móvil, flex-row en desktop)
    - Selector de zona horaria movido al header (eliminado el FAB flotante)
    - Botones adaptados: texto completo en desktop, solo iconos en móvil
    - Badges de impacto ocultos en móvil para ahorrar espacio
    - Filtros con texto abreviado en móvil ("Filtros" vs "Centro de Control - Filtros Avanzados")
    - Padding y márgenes optimizados para pantallas pequeñas (px-3 en móvil, px-4-6-8 en desktop)
    - Sticky positioning ajustado para diferentes tamaños (top-[68px] móvil, top-[77px] desktop)
  
  - **API Status**: Finnworlds API retorna error "Error route" - investigando alternativas gratuitas

- **October 14, 2025**: ✅ Full Spanish Translation & Redesign Complete
  - **Backend Changes**:
    - Removed ALL fallback/simulated data - application now shows clear errors when API fails (no mock data)
    - Returns 500 error with Spanish message when Finnworlds API unavailable
    - Secure API key management via environment variables
    - Query parameter forwarding (countries, impacts, dateRange, search, timezone)
    - Comprehensive error handling (401/403 authentication errors)
  
  - **Frontend UI Redesign** (based on user's reference image):
    - **Header**: "El Master - Calendario Económico Global" with logo icon
    - **Status Badges**: Real-time event counters (Alta/Media/Baja) in header
    - **Error Banner**: Prominent red-bordered banner when API fails (with SVG icon, no emojis)
    - **Filter Section**: "Centro de Control - Filtros Avanzados" with icon
    - **Improved States**: Enhanced error/empty states with "Intentar de nuevo" button
    - All backgrounds using bg-card, bg-muted for visual hierarchy
  
  - **Complete Spanish Translation**:
    - All UI labels, buttons, and messages translated
    - Filter controls: "País", "Impacto", "Buscar eventos..."
    - Notification dialog: "Alertas", "Notificaciones de Eventos", "Activar Notificaciones"
    - Time periods: "Hoy", "Esta Semana", "Próxima Semana", "Este Mes"
    - Error messages: "Error al cargar los datos económicos desde Finnworlds API..."
    - Timezone selector in Spanish
    - NO English text anywhere in the application
  
  - **Features Removed**:
    - CSV Export functionality completely removed (button and code)
  
  - **Technical Improvements**:
    - Fixed dropdown z-index (z-[200]) to overlay properly
    - All interactive elements have data-testid attributes for testing
    - No emoji usage - SVG icons only (Lucide icons and inline SVG)
    - Sticky positioning with proper z-index hierarchy
  
  - **Testing**: E2E tests passed validating Spanish translation, redesigned UI, filters, timezone, dropdown z-index, and CSV removal

  **Known Limitations:**
  - Timezone handling: Event times from API are parsed as ISO strings without explicit timezone metadata. Display applies timezone conversion, but accuracy depends on API's source timezone (assumed to be browser-local time). Future enhancement: confirm API timezone format.
  - Watchlist feature: Backend infrastructure complete (PostgreSQL database, API endpoints, session management) but frontend UI not implemented due to time constraints. Ready for frontend development.

## Watchlist/Favorites Feature Status

**Backend Complete (Production Ready):**
- PostgreSQL tables: `watchlist_countries` and `watchlist_events`
- Database storage layer with 6 CRUD methods in `server/storage.ts`
- RESTful API endpoints:
  - GET/POST/DELETE `/api/watchlist/countries`
  - GET/POST/DELETE `/api/watchlist/events`
- Session-based user identification via `x-session-id` header
- Session ID generation utility in `client/src/lib/session.ts`
- Database schema successfully migrated

**Frontend Pending:**
- Star/bookmark icons on events table
- Watchlist management panel/dialog
- "Watchlist Only" filter toggle
- Integration with calendar page
- E2E testing

**Technical Debt:**
- API validation errors return 500 instead of 400 (should be fixed)

## Project Architecture

### Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, Express.js
- **Data Fetching**: TanStack Query (React Query)
- **Date Handling**: date-fns, date-fns-tz
- **API**: Finnworlds Economic Calendar API

### Key Features
1. **Filter Controls**
   - Multi-select country dropdown
   - Impact level toggles (High/Medium/Low with color indicators)
   - Time period tabs (Today/This Week/Next Week/This Month)
   - Global search by event name or country

2. **Economic Events Table**
   - Responsive design with horizontal scrolling on mobile
   - Columns: Date, Time, Country (with flags), Event, Impact, Actual, Forecast, Previous
   - Timezone-aware time display
   - Visual impact indicators with color coding

3. **Timezone Management**
   - Automatic timezone detection
   - Manual timezone selector (floating action button)
   - Support for common timezones worldwide

4. **Design System**
   - Professional blue color scheme (hsl(215 85% 55%))
   - Impact colors: High (red), Medium (amber), Low (green)
   - Inter font for UI, JetBrains Mono for numeric data
   - Consistent spacing and typography hierarchy
   - Dark mode support

### File Structure
```
client/
├── src/
│   ├── components/
│   │   ├── calendar/
│   │   │   ├── filter-controls.tsx    # Filter UI components
│   │   │   ├── events-table.tsx       # Events data table
│   │   │   └── timezone-selector.tsx   # Timezone picker
│   │   └── ui/                         # Shadcn components
│   ├── pages/
│   │   └── calendar.tsx                # Main calendar page
│   └── App.tsx                          # App router

server/
├── routes.ts                            # API endpoints
└── index.ts                             # Express server setup

shared/
└── schema.ts                            # Shared data schemas
```

### API Integration
- **Finnworlds API**: Real-time economic calendar data for 196 countries
- **API Key**: Stored securely in environment variable `FINNWORLDS_API_KEY`
- **Backend Proxy Endpoint**: `/api/events`
  - Query parameters: `countries`, `impacts`, `dateRange`, `search`, `timezone`
  - Forwards requests to `https://api.finnworlds.com/api/v1/economiccalendar`
  - Error handling for authentication failures (401/403)
  - Automatic fallback to sample data when API unavailable
- **Data Flow**: Frontend → Express Proxy → Finnworlds API → Response with timezone conversion

## User Preferences

### Design Preferences
- Professional financial data aesthetic
- Clean, information-dense layout
- Minimal animations, focus on data clarity
- Responsive design for mobile and desktop

### Functional Requirements
- Real-time economic event data
- Advanced filtering capabilities
- Timezone conversion
- Fast, responsive interface
