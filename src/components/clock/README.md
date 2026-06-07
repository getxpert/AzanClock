# Clock Component Refactoring

This directory contains the refactored Clock component, split into logical sub-components for better maintainability and code organization.

## Component Structure

### Main Component
- **Clock.js** - Main orchestrator component that manages state and renders all sub-components

### Sub-Components

1. **HadithDisplay.js**
   - Displays the hadith of the hour
   - Shows Arabic text with expandable English translation
   - Tap to expand/collapse functionality
   - Positioned in the top-right area

2. **EventsPanel.js**
   - Shows active and upcoming events
   - Active events display with "NOW" badge
   - Upcoming events show countdown and scheduled time
   - Color-coded based on urgency
   - Positioned in the left area (portable-landscape) or lower-left (other profiles)

3. **PrayerTopBar.js**
   - Displays prayer times in a horizontal bar at the top
   - Shows all daily prayers (Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha)
   - Highlights current prayer with color-coded background
   - Arabic prayer names with 12-hour time format

4. **WeatherDisplay.js**
   - Shows current weather icon and temperature
   - Displays moon phase after sunset (Maghrib, Isha, Imsak)
   - Location information (address and country)
   - Temperature color-coded based on configurable bands
   - Positioned in top-left (portrait mode only)

5. **DateOverlay.js**
   - Displays both Gregorian and Islamic (Hijri) dates
   - Gregorian date: bottom-left with day name, month, day, year
   - Islamic date: bottom-right with Arabic day name, Hijri month, day, year
   - Color-coded: weekends (green), weekdays (amber), Friday (green), Ramadan (green)
   - Eastern Arabic numerals for Hijri date

6. **SidePanels.js**
   - Left panels: Gregorian days (1-31) and months (Jan-Dec)
   - Right panels: Hijri days (1-30) and months (Arabic names)
   - Corner elements: App icon, "نور الصلاة" text, year displays
   - Color-coded highlights for current day/month
   - Only shown in desktop profile

7. **BottomPanel.js**
   - Days of the week in English (Mon-Sun) and Arabic (الأحد-السبت)
   - Highlights current day
   - Weekend highlighting (green for weekends, amber for weekdays)
   - Friday highlighted in green for Islamic week
   - Only shown in desktop profile

8. **MainDial.js**
   - Main clock canvas with all drawing logic
   - 24-hour dial with prayer time arcs
   - Analogue clock hands (hour, minute, second)
   - Digital time display option
   - Weather/moon display inside dial (landscape profiles)
   - Alarm indicators
   - Night fraction markers (1/2, 1/3, 2/3)

## Data Flow

```
Clock (Main Component)
├── Manages all state (hadith, events, drag handlers)
├── Loads context from AppContext
├── Calculates profile-specific layout constants
└── Renders sub-components with props

Sub-Components
├── Receive data via props
├── Handle their own rendering logic
└── Return JSX or null (if hidden)
```

## Profile System

The clock supports three display profiles:

1. **desktop** - Full layout with all panels and corners
2. **portable-landscape** - Simplified layout without side panels
3. **portable-portrait** - Minimal layout, portrait orientation

Each profile has specific layout constants:
- `TOP_BAR`, `BOTTOM_BAR` - Header/footer heights
- `SIDE_INNER`, `SIDE_OUTER_L`, `SIDE_OUTER_R` - Side panel widths
- `showSidePanels`, `showBottomPanel`, `showCornerYears` - Visibility flags
- Responsive font sizes using `clamp()` for various elements

## Benefits of Refactoring

1. **Maintainability** - Each component has a single, clear responsibility
2. **Readability** - Smaller files are easier to understand and navigate
3. **Reusability** - Components can be reused or modified independently
4. **Testing** - Individual components can be tested in isolation
5. **Performance** - React can optimize re-renders more effectively
6. **Collaboration** - Multiple developers can work on different components

## Original File

The original monolithic Clock.js file (2000+ lines) has been backed up as:
- `src/components/Clock.backup.js`

## Migration Notes

- All functionality from the original Clock.js has been preserved
- The GUI remains identical to the original implementation
- No breaking changes to the AppContext or external dependencies
- Canvas drawing logic remains in MainDial.js for performance
