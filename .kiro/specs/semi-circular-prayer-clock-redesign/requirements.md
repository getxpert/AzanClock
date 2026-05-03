# Requirements Document: Semi-Circular Prayer Clock Redesign

## Introduction

This document specifies the requirements for transforming the existing circular 24-hour prayer clock into a semi-circular display with enhanced features. The redesign optimizes screen real estate by displaying only 12 hours at a time in a 180-degree arc, with the circle center positioned at the bottom of the screen and the current time always displayed at the top center. The system incorporates weather integration, intelligent background dimming, Arabic prayer names, and dual calendar displays while maintaining all existing functionality.

## Glossary

- **Clock_Renderer**: The canvas-based rendering system that draws the semi-circular clock display
- **Time_Calculator**: The module that converts time values to angular positions on the clock
- **Weather_Service**: The service that fetches and manages weather data and moon phase information
- **Dimming_Controller**: The system that manages background opacity based on sunrise/sunset transitions
- **Prayer_Band**: A colored arc segment representing a prayer time period
- **Night_Fraction_Marker**: Visual indicators for midnight, 1/3 night, and 2/3 night positions
- **Rotation_Angle**: The angular offset applied to keep the current time at the top center position
- **Alarm_Indicator**: Visual markers showing scheduled alarm times on the clock face
- **Semi_Circle**: A 180-degree arc displaying 12 hours of time
- **Hijri_Date**: The Islamic calendar date
- **Gregorian_Date**: The standard Western calendar date
- **Moon_Phase**: The current phase of the lunar cycle
- **Weather_Data**: Temperature, conditions, and related meteorological information
- **Screen_Orientation**: The device display mode (portrait or landscape)
- **Radius**: The distance from the center point to the outer edge of the clock
- **Arabic_Prayer_Name**: The transliterated Arabic name of the current prayer time

## Requirements

### Requirement 1: Semi-Circular Display Geometry

**User Story:** As a user, I want to see a semi-circular clock display, so that the interface uses screen space efficiently while showing relevant time information.

#### Acceptance Criteria

1. THE Clock_Renderer SHALL display a 180-degree arc representing 12 hours of time
2. THE Clock_Renderer SHALL position the circle center at the bottom edge of the screen
3. THE Clock_Renderer SHALL display exactly 12 hour labels on the semi-circular arc
4. WHEN the screen orientation changes, THE Clock_Renderer SHALL recalculate the Radius to fit the shorter screen dimension
5. THE Clock_Renderer SHALL maintain all visual elements within the visible semi-circular area

### Requirement 2: Current Time Positioning

**User Story:** As a user, I want the current time to always appear at the top center of the display, so that I can quickly see the current time without searching the clock face.

#### Acceptance Criteria

1. THE Clock_Renderer SHALL calculate the Rotation_Angle needed to position the current time at the top center
2. THE Clock_Renderer SHALL apply the Rotation_Angle to all clock elements continuously
3. WHEN time advances, THE Clock_Renderer SHALL update the Rotation_Angle to maintain current time at top center
4. THE Clock_Renderer SHALL display the current time value at the bottom of the screen (below the semi-circle center)
5. THE Clock_Renderer SHALL rotate the display smoothly without visual discontinuities

### Requirement 3: Prayer Time Visualization

**User Story:** As a user, I want to see prayer times as colored bands on the clock, so that I can understand the prayer schedule at a glance.

#### Acceptance Criteria

1. THE Clock_Renderer SHALL draw Prayer_Band arcs for each prayer time period within the visible 180-degree range
2. WHEN a Prayer_Band extends beyond the visible semi-circle, THE Clock_Renderer SHALL clip it at the 0-degree and 180-degree boundaries
3. THE Clock_Renderer SHALL highlight the current Prayer_Band with increased width and full opacity
4. THE Clock_Renderer SHALL display non-current Prayer_Bands with reduced width and partial opacity
5. THE Clock_Renderer SHALL display the Arabic_Prayer_Name for the current prayer time

### Requirement 4: Weather Integration

**User Story:** As a user, I want to see current weather information and moon phase on the clock, so that I have relevant environmental context.

#### Acceptance Criteria

1. THE Weather_Service SHALL fetch Weather_Data from an external API at hourly intervals
2. THE Weather_Service SHALL fetch Moon_Phase information at hourly intervals
3. THE Clock_Renderer SHALL display the current temperature on the clock face
4. THE Clock_Renderer SHALL display the current weather condition description on the clock face
5. THE Clock_Renderer SHALL display the current Moon_Phase on the clock face
6. WHEN the Weather_Service fails to fetch data, THE Clock_Renderer SHALL continue displaying the last successfully retrieved Weather_Data

### Requirement 5: Intelligent Background Dimming

**User Story:** As a user, I want the background to dim automatically during nighttime hours, so that the display is comfortable to view in dark conditions.

#### Acceptance Criteria

1. THE Dimming_Controller SHALL calculate sunrise and sunset times based on the user's location
2. WHEN the current time is between sunset and sunrise, THE Dimming_Controller SHALL apply opacity reduction to the background
3. THE Dimming_Controller SHALL calculate smooth opacity transitions during the 30-minute periods after sunset and before sunrise
4. WHEN the current time is between sunrise and sunset, THE Dimming_Controller SHALL display the background at full opacity
5. THE Dimming_Controller SHALL update the dimming level continuously as time progresses

### Requirement 6: Calendar Display

**User Story:** As a user, I want to see both Hijri and Gregorian dates on the clock, so that I can reference both calendar systems.

#### Acceptance Criteria

1. THE Clock_Renderer SHALL display the Gregorian_Date on the clock face
2. THE Clock_Renderer SHALL display the Hijri_Date on the clock face
3. THE Clock_Renderer SHALL position both dates to remain readable after rotation
4. WHEN the date changes at midnight, THE Clock_Renderer SHALL update both Gregorian_Date and Hijri_Date
5. THE Clock_Renderer SHALL format dates in a clear, readable manner

### Requirement 7: Night Fraction Markers

**User Story:** As a user, I want to see markers for midnight and night fractions, so that I can identify significant nighttime prayer periods.

#### Acceptance Criteria

1. THE Clock_Renderer SHALL draw a Night_Fraction_Marker at the midnight position with label "1/2"
2. THE Clock_Renderer SHALL draw a Night_Fraction_Marker at the one-third night position with label "1/3"
3. THE Clock_Renderer SHALL draw a Night_Fraction_Marker at the two-thirds night position with label "2/3"
4. WHEN a Night_Fraction_Marker is outside the visible 180-degree range, THE Clock_Renderer SHALL not display it
5. THE Clock_Renderer SHALL rotate Night_Fraction_Markers along with all other clock elements

### Requirement 8: Alarm Indicators

**User Story:** As a user, I want to see my scheduled alarms marked on the clock, so that I can visualize when alarms will trigger.

#### Acceptance Criteria

1. THE Clock_Renderer SHALL display an Alarm_Indicator for each active alarm at its scheduled time position
2. THE Clock_Renderer SHALL display regular alarms with a distinct color (red)
3. THE Clock_Renderer SHALL display nafl (optional prayer) alarms with a different color (yellowgreen)
4. WHEN an Alarm_Indicator is outside the visible 180-degree range, THE Clock_Renderer SHALL not display it
5. WHEN an alarm frequency is set to "everyday" or "weekday" and the current day matches, THE Clock_Renderer SHALL display the Alarm_Indicator

### Requirement 9: Time Label Display

**User Story:** As a user, I want to see hour labels around the clock arc, so that I can read specific times from the clock face.

#### Acceptance Criteria

1. THE Clock_Renderer SHALL display 12 hour labels evenly distributed across the 180-degree arc
2. THE Clock_Renderer SHALL format hour labels in 12-hour format with AM/PM indicators
3. THE Clock_Renderer SHALL position hour labels at the outer edge of the clock arc
4. THE Clock_Renderer SHALL rotate hour labels to remain upright and readable
5. THE Clock_Renderer SHALL display minute tick marks between hour labels

### Requirement 10: Responsive Radius Calculation

**User Story:** As a user, I want the clock to adapt to my screen size and orientation, so that it displays optimally on any device.

#### Acceptance Criteria

1. WHEN the screen is in portrait orientation, THE Clock_Renderer SHALL calculate Radius based on screen width
2. WHEN the screen is in landscape orientation, THE Clock_Renderer SHALL calculate Radius based on screen height
3. THE Clock_Renderer SHALL ensure the full semi-circle fits within the visible screen area
4. WHEN the screen size changes, THE Clock_Renderer SHALL recalculate and redraw the clock with the new Radius
5. THE Clock_Renderer SHALL scale all visual elements proportionally to the Radius

### Requirement 11: Existing Functionality Preservation

**User Story:** As a user, I want all existing clock features to continue working, so that I don't lose functionality with the redesign.

#### Acceptance Criteria

1. THE Clock_Renderer SHALL maintain the screen saver drift functionality
2. THE Clock_Renderer SHALL maintain the drag-to-reposition functionality
3. THE Clock_Renderer SHALL maintain the click-to-toggle-menu functionality
4. THE Clock_Renderer SHALL maintain the zoom functionality
5. THE Clock_Renderer SHALL maintain the elapsed time and next prayer countdown display

### Requirement 12: Visual Hierarchy and Styling

**User Story:** As a user, I want the clock to have clear visual hierarchy and attractive styling, so that information is easy to read and aesthetically pleasing.

#### Acceptance Criteria

1. THE Clock_Renderer SHALL use consistent color schemes for all visual elements
2. THE Clock_Renderer SHALL apply appropriate font sizes for different text elements based on their importance
3. THE Clock_Renderer SHALL ensure text contrast is sufficient for readability against all backgrounds
4. THE Clock_Renderer SHALL position the Arabic_Prayer_Name prominently on the display
5. THE Clock_Renderer SHALL position Weather_Data and Moon_Phase information in a non-intrusive location
