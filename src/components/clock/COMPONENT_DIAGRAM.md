# Clock Component Architecture Diagram

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PrayerTopBar.js                                  │
│  Fajr | Sunrise | Dhuhr | Asr | Maghrib | Isha (with times)            │
└─────────────────────────────────────────────────────────────────────────┘

┌──────┬──┬─────────────────────────────────────────────────────┬──┬──────┐
│ Jan  │1 │                                                      │1 │محرم  │
│ Feb  │2 │                                                      │2 │صفر   │
│ Mar  │3 │  ┌──────────────────────────────────────────┐      │3 │ربيع  │
│ Apr  │4 │  │                                           │      │4 │ربيع  │
│ May  │5 │  │                                           │      │5 │جمادى │
│ Jun  │6 │  │                                           │      │6 │جمادى │
│ Jul  │7 │  │                                           │      │7 │رجب   │
│ Aug  │8 │  │          MainDial.js                      │      │8 │شعبان │
│ Sep  │9 │  │      (Canvas Clock)                       │      │9 │رمضان │
│ Oct  │10│  │                                           │      │10│شوال  │
│ Nov  │11│  │   • 24-hour dial                          │      │11│ذوالقعدة│
│ Dec  │12│  │   • Prayer arcs                           │      │12│ذوالحجة│
│      │  │  │   • Analogue hands                        │      │  │      │
│      │  │  │   • Digital time                          │      │  │      │
│      │  │  │   • Alarm indicators                      │      │  │      │
│      │  │  │                                           │      │  │      │
│      │  │  └──────────────────────────────────────────┘      │  │      │
│      │  │                                                      │  │      │
└──────┴──┴─────────────────────────────────────────────────────┴──┴──────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         BottomPanel.js                                   │
│  Mon | Tue | Wed | Thu | Fri | Sat | Sun (English + Arabic)            │
└─────────────────────────────────────────────────────────────────────────┘
```

## Overlay Components (Positioned Absolutely)

### Top-Left Area
```
┌─────────────────────┐
│ WeatherDisplay.js   │
│ ☀️ 25°C             │
│ ─────────────────   │
│ London              │
│ United Kingdom      │
└─────────────────────┘
```

### Top-Right Area
```
┌──────────────────────────────┐
│ HadithDisplay.js             │
│ ─────────────────────────    │
│ حديث شريف بالعربية...       │
│ ─────────────────────────    │
│ English translation...       │
│ Reference: Bukhari 123       │
└──────────────────────────────┘
```

### Left Area
```
┌─────────────────────────┐
│ EventsPanel.js          │
│ ┌─────────────────────┐ │
│ │ NOW                 │ │
│ │ Meeting             │ │
│ │ ⏱ 15 min left      │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Tomorrow            │ │
│ │ Appointment         │ │
│ │ ⏳ 1d 5h           │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Bottom-Left
```
┌──────────────────────┐
│ DateOverlay.js       │
│ (Gregorian)          │
│                      │
│ Friday               │
│ May 8, 2026          │
└──────────────────────┘
```

### Bottom-Right
```
┌──────────────────────┐
│ DateOverlay.js       │
│ (Islamic)            │
│                      │
│ الجمعة              │
│ ١٠ رمضان ١٤٤٧ هـ   │
└──────────────────────┘
```

## Component Hierarchy

```
Clock.js (Main Container)
│
├─ State Management
│  ├─ dailyHadith
│  ├─ hadithExpanded
│  ├─ eventsData
│  ├─ drag handlers
│  └─ refs (canvas, drift, drag)
│
├─ Context (from AppContext)
│  ├─ vakits, arcVakits
│  ├─ currentVakit, nextVakit
│  ├─ weatherData
│  ├─ locationSettings
│  ├─ deviceSettings
│  └─ ... (many more)
│
├─ Computed Values
│  ├─ profile (desktop/portable-landscape/portable-portrait)
│  ├─ PROFILE constants
│  ├─ currentHijriDay
│  └─ layout dimensions
│
└─ Rendered Components
   │
   ├─ PrayerTopBar
   │  └─ Props: vakits, currentVakit, nextVakit, time, layout
   │
   ├─ BottomPanel (conditional)
   │  └─ Props: locationSettings, currentVakit, layout
   │
   ├─ SidePanels (conditional)
   │  └─ Props: dates, locationSettings, currentVakit, layout
   │
   ├─ HadithDisplay
   │  └─ Props: dailyHadith, hadithExpanded, setHadithExpanded, profile, layout
   │
   ├─ EventsPanel
   │  └─ Props: eventsData, profile, layout
   │
   ├─ DateOverlay
   │  └─ Props: dates, locationSettings, currentVakit, profile, layout
   │
   ├─ WeatherDisplay
   │  └─ Props: weatherData, currentVakit, currentHijriDay, locationSettings, profile, layout
   │
   ├─ MainDial
   │  └─ Props: canvasRef, all clock data, refs, profile
   │
   └─ Canvas Container
      └─ Contains: drift wrapper, drag wrapper, canvas element
```

## Data Flow Diagram

```
┌─────────────────┐
│   AppContext    │
│  (Global State) │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│    Clock.js     │
│  (Orchestrator) │
└────────┬────────┘
         │
         ├─────────────────────────────────────────────────┐
         │                                                  │
         ↓                                                  ↓
┌─────────────────┐                              ┌──────────────────┐
│  State Updates  │                              │  Props to        │
│  • Hadith       │                              │  Sub-Components  │
│  • Events       │                              └──────────────────┘
│  • Drag         │                                       │
└─────────────────┘                                       │
         │                                                 │
         ↓                                                 ↓
┌─────────────────┐                              ┌──────────────────┐
│  Side Effects   │                              │  Render Tree     │
│  • Timers       │                              │  • Layout        │
│  • Fetch        │                              │  • Styling       │
│  • Background   │                              │  • Interaction   │
└─────────────────┘                              └──────────────────┘
```

## Responsive Behavior

### Desktop Profile
- All panels visible
- Full side calendars
- Corner elements
- Maximum information density

### Portable-Landscape Profile
- No side panels
- No bottom panel
- Events in left gutter
- Hadith in right gutter
- Optimized for tablets

### Portable-Portrait Profile
- Minimal panels
- No side elements
- Centered date
- Weather overlay only
- Optimized for phones

## Component Communication

```
Clock.js
   │
   ├─ Passes Props ──→ Sub-Components
   │                   (One-way data flow)
   │
   ├─ Provides Callbacks ──→ HadithDisplay
   │                         (setHadithExpanded)
   │
   └─ Manages Refs ──→ MainDial
                       (canvasRef, moonImgRef, etc.)
```

## Performance Considerations

1. **MainDial** - Canvas rendering in useEffect
2. **EventsPanel** - Memoization candidate for event list
3. **DateOverlay** - Static content, rarely updates
4. **PrayerTopBar** - Updates only on prayer time changes
5. **WeatherDisplay** - Updates on weather data fetch

## Testing Strategy

```
Unit Tests
├─ HadithDisplay
│  ├─ Expand/collapse
│  └─ Content rendering
├─ EventsPanel
│  ├─ Active events
│  ├─ Upcoming events
│  └─ Badge logic
├─ PrayerTopBar
│  ├─ Prayer highlighting
│  └─ Time formatting
└─ ... (other components)

Integration Tests
├─ Clock.js
│  ├─ State management
│  ├─ Context integration
│  └─ Sub-component coordination

Visual Tests
├─ Desktop profile
├─ Portable-landscape profile
└─ Portable-portrait profile
```
