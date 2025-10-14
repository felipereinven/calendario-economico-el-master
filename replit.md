# Global Economic Calendar

A professional web application for tracking real-time global economic events and market indicators across 196 countries. Built with modern web technologies and featuring advanced filtering, timezone management, and a clean, responsive interface inspired by Investing.com.

## Overview

This application serves as an interactive Global Economic Calendar that displays financial events with comprehensive filtering capabilities. Users can filter by country, impact level, time period, and search for specific events. The application automatically detects the user's timezone and allows manual timezone selection for personalized event time display.

## Recent Changes

- **October 14, 2025**: Initial implementation complete
  - Data schema and TypeScript interfaces for economic events
  - Professional UI design with Tailwind CSS and Shadcn components
  - Multi-select country filter (USD, EUR, GBP, JPY, CNY, AUD, CAD, CHF, NZD)
  - Impact level filter with visual indicators (High/Medium/Low)
  - Time period quick filters (Today, This Week, Next Week, This Month)
  - Global search functionality
  - Timezone selector with automatic detection
  - Responsive events table with Date/Time/Country/Event/Impact/Actual/Forecast/Previous columns
  - Express.js backend proxy for secure API integration
  - Date range filtering and search capabilities

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
- Finnworlds API key stored securely in environment variables
- Backend proxy endpoint: `/api/events`
- Query parameters: countries, impacts, dateRange, search, timezone
- Sample data implementation (ready for real API integration)

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
