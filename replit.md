# Global Economic Calendar

A professional web application for tracking real-time global economic events and market indicators across 196 countries. Built with modern web technologies and featuring advanced filtering, timezone management, and a clean, responsive interface inspired by Investing.com.

## Overview

This application serves as an interactive Global Economic Calendar that displays financial events with comprehensive filtering capabilities. Users can filter by country, impact level, time period, and search for specific events. The application automatically detects the user's timezone and allows manual timezone selection for personalized event time display.

## Recent Changes

- **October 14, 2025**: ✅ Extended MVP - Core features + Notifications & Export
  - **Data Layer**: Economic event schema with TypeScript interfaces and Zod validation
  - **Backend**: Express.js proxy server with Finnworlds API integration
    - Secure API key management via environment variables
    - Query parameter forwarding (countries, impacts, dateRange, search, timezone)
    - Comprehensive error handling (401/403 authentication errors)
    - Fallback to sample data when API unavailable
    - Defensive time parsing to prevent frontend crashes
  - **Frontend Components**:
    - Filter Controls: Multi-select country dropdown, impact level toggles, time period tabs, global search
    - Events Table: Responsive table with timezone-aware display, impact indicators, hover states
    - Timezone Selector: Automatic detection with manual override (floating action button)
    - Auto-Refresh: Configurable intervals (Off/30s/1m/5m) with manual refresh and last-updated timestamp
    - Notifications: Browser notifications for new high-impact events with badge counter
    - CSV Export: Download filtered events with timezone-aware formatting
  - **UI/UX Polish**:
    - Professional design following Investing.com aesthetic
    - Sticky filter controls with proper z-index hierarchy
    - Loading, error, and empty states with appropriate messaging
    - All interactive elements have data-testid attributes for testing
    - No emoji usage - using Lucide icons and proper text throughout
  - **Testing**: E2E tests passed validating filters, search, timezone, responsive design, auto-refresh, notifications, and export functionality

  **Known Limitations:**
  - Timezone handling: Event times from API are parsed as ISO strings without explicit timezone metadata. Both table display and CSV export apply the same timezone conversion logic for consistency, but accuracy depends on API's source timezone (assumed to be browser-local time). Future enhancement: confirm API timezone format and implement proper timezone conversion.

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
