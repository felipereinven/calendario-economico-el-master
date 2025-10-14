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
- **Backend Proxy**: An Express.js proxy (`/api/events`) handles requests to the Finnworlds API, forwarding query parameters and managing API key security.
- **Data Handling**: Finnworlds API responses are processed, including mapping impact levels and handling 404 responses gracefully.
- **Error Handling**: Comprehensive error handling is implemented, providing clear Spanish messages for API failures (e.g., 500 errors for unavailable API, 401/403 for authentication). No fallback/mock data is used.
- **Performance Optimization**: Queries for date ranges are optimized, with a maximum of 14 days per API call and parallelized requests for country-date combinations, limited by the API's constraints.

## External Dependencies

- **Finnworlds Economic Calendar API**: Provides real-time economic calendar data. The application is configured to track 8 major economies (USA, Eurozone, Germany, France, Spain, UK, China, Japan) to optimize API rate limits and performance.
- **PostgreSQL**: Used as the database for the Watchlist/Favorites feature, storing user-specific country and event watchlists.