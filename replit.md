# Global Economic Calendar

## Overview

This application is a professional web application designed to track real-time global economic events and market indicators from 8 major economies (United States, Eurozone, Germany, France, Spain, United Kingdom, China, and Japan). Its primary purpose is to provide users with a comprehensive, interactive economic calendar featuring advanced filtering, timezone management, and a clean, responsive interface. The project aims to deliver a tool for financial professionals and enthusiasts to monitor critical economic data, similar to platforms like Investing.com.

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

## System Architecture

The application is built with a modern web technology stack, ensuring a responsive and efficient user experience.

### Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, Express.js
- **Data Fetching**: TanStack Query (React Query)
- **Date Handling**: date-fns, date-fns-tz
- **API**: Finnworlds Economic Calendar API

### UI/UX Decisions
- **Color Scheme**: Professional blue (hsl(215 85% 55%)) with specific impact colors (red for High, amber for Medium, green for Low).
- **Typography**: Inter font for UI text, JetBrains Mono for numeric data.
- **Design Elements**: Consistent spacing, typography hierarchy, and a dark mode activated by default.
- **Responsiveness**: Full mobile responsiveness across all components, adapting layouts and element visibility (e.g., hiding impact badges on mobile, abbreviated filter text).
- **Localization**: Complete Spanish translation for all UI elements, labels, and messages. No English text is present. SVG icons are used instead of emojis.

### Feature Specifications
- **Filter Controls**: Multi-select country dropdown with flags, impact level toggles (High/Medium/Low), time period tabs (Today, This Week, Next Week, This Month), global search, and economic category filter (9 categories: Empleo, Inflación, Política Monetaria, Manufactura, Servicios, PIB y Crecimiento, Comercio Exterior, Energía, Confianza). Intelligent categorization of events based on 100+ Spanish/English keywords with 86% coverage (32 of 37 events categorized on average).
- **Economic Events Table**: Displays Date, Time, Country (with flags), Event, Impact, Actual, Forecast, Previous. Events are translated from English to Spanish. Includes timezone-aware time display and visual impact indicators.
- **Timezone Management**: Automatic detection and manual selection via a dedicated selector, supporting common timezones.
- **Automatic Daily Updates**: The system automatically detects day changes and updates data hourly to ensure current information.
- **Rate Limiting Solution**: Server-side caching with a 5-minute TTL, sequential API requests (1 request every 3 seconds), and global fetch lock to handle Finnworlds API rate limits. Cache keys are normalized, empty responses are cached, and concurrent requests to the same data share a single fetch operation to prevent rate limit violations.
- **Watchlist/Favorites**: Backend infrastructure is complete with PostgreSQL tables (`watchlist_countries`, `watchlist_events`), RESTful API endpoints for CRUD operations, and session-based user identification. Frontend implementation is pending.

### System Design Choices
- **Database Caching Architecture**: Complete PostgreSQL caching layer with `cached_events` table. Deterministic SHA-256 event IDs prevent duplicates. All requests served from database (<1s response) with background refresh jobs maintaining data freshness. Events are deduplicated by ID before saving to prevent ON CONFLICT errors.
- **Dual Refresh Strategy**: 
  - **Initial bootstrap**: On cold start, loads current month start + 67 days (~2 months) for complete coverage
  - **Nightly job**: 2AM UTC, refreshes current month start + 90 days forward (3 months)
  - **Hourly job**: Rolling 14-day window (today ±7 days) for recent data updates
  - **Incremental saves**: Events are saved day-by-day during refresh for immediate availability
  - **Concurrency prevention**: Global refresh lock + per-fetch lock prevent duplicate API calls
- **Smart Hybrid Fallback**: On cold start, detects empty cache and performs one-time bootstrap fetch. Returns 503 with clear Spanish error messages if API key missing. Subsequent requests are cache-first.
- **Date-String Filtering**: Queries use local date strings (YYYY-MM-DD) for timezone-aware filtering, ensuring "Today" filter shows correct date across all timezones. Week ranges are Monday-Sunday. Fixed critical timezone bug from previous UTC timestamp approach.
- **Bilingual Field Storage**: Events stored with both `eventOriginal` (English for categorization logic) and `event` (Spanish for UI display).
- **Finnworlds API Integration**: Correct endpoint (`/api/v1/macrocalendar`) with ISO-2 country codes (`us`, `gb`, `de`, etc.). Impact mapping: "3"=high, "2"=medium, "1"=low.
- **Bulk Database Operations**: Batches of 100 events with `ON CONFLICT DO UPDATE` for efficient upserts. Composite indexes on (event_date, country, impact) for fast filtering. Auto-deduplication prevents duplicate IDs in same batch.
- **Shared Utilities**: Extracted event taxonomy (200+ translations, categorization) and date-range logic to eliminate code duplication.
- **Error Handling**: Comprehensive validation and graceful degradation. Spanish user messages with English technical details for debugging.
- **180-Day Retention**: Automated cleanup job maintains reasonable database size (6 months).

## External Dependencies

- **Finnworlds Economic Calendar API**: Provides real-time economic calendar data via `/api/v1/macrocalendar` endpoint. Uses ISO-2 country codes for requests. The application is configured to track 8 major economies (USA, EUR, DEU, FRA, ESP, GBR, CHN, JPN) with automatic fallback for empty responses.
- **PostgreSQL**: Primary database for both application data and caching layer. Stores cached economic events with deterministic IDs, watchlist countries/events, and provides optimized query performance with composite indexes.