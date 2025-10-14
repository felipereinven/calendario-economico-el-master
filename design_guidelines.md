# Global Economic Calendar - Design Guidelines

## Design Approach
**Selected Approach**: Design System (Material Design + Investing.com Reference)

**Justification**: This is a utility-focused, information-dense financial application where functionality and data clarity are paramount. We'll use Material Design principles for data presentation while drawing visual inspiration from Investing.com and the provided reference site for financial UI patterns.

**Key Design Principles**:
- Data clarity over decoration
- Professional, trustworthy aesthetic
- Efficient scanning and filtering
- Consistent financial data patterns

---

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary)**:
- Background Base: 215 20% 12%
- Surface Elevated: 215 18% 16%
- Surface Accent: 215 16% 20%
- Text Primary: 0 0% 95%
- Text Secondary: 0 0% 70%
- Border Subtle: 215 15% 25%

**Light Mode**:
- Background Base: 0 0% 98%
- Surface Elevated: 0 0% 100%
- Surface Accent: 215 25% 97%
- Text Primary: 215 20% 15%
- Text Secondary: 215 15% 45%
- Border Subtle: 215 15% 90%

**Impact Level Colors** (Both Modes):
- High Impact: 0 70% 55% (Red)
- Medium Impact: 45 90% 55% (Amber)
- Low Impact: 145 60% 50% (Green)
- Positive Data: 145 60% 50%
- Negative Data: 0 70% 55%

**Accent Color**:
- Primary Accent: 215 85% 55% (Professional Blue)
- Accent Hover: 215 85% 48%

---

### B. Typography

**Font Stack**: 
- Primary: 'Inter', system-ui, -apple-system, sans-serif (via Google Fonts)
- Monospace: 'JetBrains Mono', 'Consolas', monospace (for data values)

**Type Scale**:
- Page Title: text-2xl font-semibold (filters section heading)
- Section Labels: text-sm font-medium uppercase tracking-wide
- Table Headers: text-xs font-semibold uppercase tracking-wider
- Table Data: text-sm font-normal (event names), text-sm font-mono (numeric values)
- Filter Labels: text-sm font-medium
- Helper Text: text-xs text-secondary

---

### C. Layout System

**Spacing Units**: Tailwind units of 2, 4, 6, 8, 12, and 16
- Micro spacing: p-2, gap-2 (tight elements)
- Component padding: p-4, p-6 (cards, filters)
- Section spacing: py-8, py-12 (major sections)
- Container margins: mx-4, mx-6 (responsive)

**Container Strategy**:
- Max width: max-w-7xl mx-auto
- Side padding: px-4 on mobile, px-6 on tablet, px-8 on desktop
- Filters bar: Full-width with inner max-w-7xl container

---

### D. Component Library

**1. Filter Control Panel**:
- Sticky header bar with backdrop blur (backdrop-blur-sm bg-surface/95)
- Horizontal layout on desktop, stacked on mobile
- Each filter group in bordered container with subtle shadow
- Country selector: Multi-select dropdown with flag icons
- Impact buttons: Pill-style toggles with colored left border indicators
- Time period tabs: Segmented control style, active state with colored bottom border
- Search field: Full-width on mobile, fixed width (w-64) on desktop

**2. Data Table**:
- Alternating row backgrounds for readability
- Fixed header with horizontal scroll on mobile
- Column widths: Date (w-24), Time (w-20), Country (w-24 with flag), Event (flex-1), Impact (w-20), Real/Forecast/Previous (w-24 each)
- Hover state: Subtle background change (bg-accent/5)
- Border style: Border-b only, color border-subtle

**3. Impact Indicators**:
- Circular badges (w-3 h-3) with corresponding colors
- Inline with event names or in dedicated column
- Pulsing animation on high-impact only (animate-pulse)

**4. Country Flags**:
- Rounded flag images (w-6 h-4 rounded-sm)
- Fallback to country code text if image unavailable

**5. Timezone Selector**:
- Floating action button (⏰) in bottom-right (fixed bottom-4 right-4)
- Opens modal overlay with timezone dropdown
- Display current timezone in footer or header

**6. Loading States**:
- Centered spinner (animate-spin w-8 h-8 border-2 border-accent)
- Skeleton rows for table during initial load
- Overlay with semi-transparent background

**7. Empty States**:
- Centered icon with descriptive message
- "No events found" with suggestion to adjust filters

**8. Mobile Adaptations**:
- Horizontal scroll table container (overflow-x-auto)
- Collapsible filter panel (expandable drawer)
- Simplified table columns on small screens (hide Previous/Forecast, show on tap)

---

### E. Animations

**Minimal Animation Strategy**:
- Filter toggle: 150ms ease transitions
- Hover states: 100ms opacity/background transitions
- Impact pulse: Only for high-impact events, subtle 2s infinite pulse
- Loading spinner: Standard rotate animation
- NO scroll animations, NO complex transitions

---

## Images

**No hero images** - This is a data-focused application. The interface leads directly with the filter controls and economic calendar table. The visual impact comes from clean data presentation, not imagery.

**Flag Icons**: Small country flag images (16x24px) integrated inline with country codes in the table.