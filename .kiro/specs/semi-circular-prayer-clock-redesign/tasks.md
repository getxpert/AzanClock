# Implementation Plan: Semi-Circular Prayer Clock Redesign

## Overview

This implementation plan transforms the existing circular 24-hour prayer clock into a semi-circular display with enhanced features. The clock will display 12 hours in a 180-degree arc with the center at the bottom of the screen and the current time always at the top center. The implementation includes weather integration, intelligent dimming, Arabic prayer names, and dual calendar displays while preserving all existing functionality.

## Tasks

- [-] 1. Set up semi-circular geometry and coordinate system
  - Modify canvas rendering to use 180-degree arc instead of full circle
  - Position circle center at bottom edge of screen
  - Implement adaptive radius calculation based on screen orientation (shorter dimension)
  - Update coordinate transformation functions for semi-circular layout
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 10.1, 10.2, 10.3_

- [ ] 1.1 Write property test for semi-circular arc geometry
  - **Property 1: Semi-Circular Arc Geometry**
  - **Validates: Requirements 1.1, 1.3, 9.1**

- [ ] 1.2 Write property test for center positioning invariant
  - **Property 2: Center Positioning Invariant**
  - **Validates: Requirements 1.2, 1.5**

- [ ] 1.3 Write property test for adaptive radius calculation
  - **Property 3: Adaptive Radius Calculation**
  - **Validates: Requirements 1.4, 10.1, 10.2, 10.3**

- [-] 2. Implement continuous rotation to keep current time at top center
  - Calculate rotation angle based on current time to position it at 90 degrees (top center)
  - Apply rotation transformation to all clock elements (prayer bands, labels, markers, indicators)
  - Update rotation continuously as time advances
  - Display current time value at bottom of screen (below semi-circle center)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2.1 Write property test for current time top-center positioning
  - **Property 4: Current Time Top-Center Positioning**
  - **Validates: Requirements 2.1, 2.3**

- [ ] 2.2 Write property test for uniform rotation transform
  - **Property 5: Uniform Rotation Transform**
  - **Validates: Requirements 2.2, 7.5**

- [-] 3. Update prayer band rendering for semi-circular display
  - Modify drawArcs function to render only bands within visible 180-degree range
  - Implement clipping logic for bands extending beyond 0° and 180° boundaries
  - Maintain current prayer band highlighting (increased width and full opacity)
  - Apply reduced width and partial opacity to non-current prayer bands
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3.1 Write property test for prayer band visibility and clipping
  - **Property 6: Prayer Band Visibility and Clipping**
  - **Validates: Requirements 3.1, 3.2**

- [ ] 3.2 Write property test for current prayer band highlighting
  - **Property 7: Current Prayer Band Highlighting**
  - **Validates: Requirements 3.3, 3.4, 3.5**

- [x] 4. Add Arabic prayer name display
  - Create mapping of prayer names to Arabic transliterations
  - Position Arabic prayer name prominently in center area of clock
  - Ensure text remains readable after rotation is applied
  - Update display when current prayer changes
  - _Requirements: 3.5, 12.4_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 6. Integrate weather service with hourly updates
  - Create Weather_Service module to fetch weather data from external API
  - Implement hourly update scheduler for weather data
  - Fetch temperature and weather condition description
  - Handle API failures gracefully by persisting last successful data
  - Store weather data in AppContext for access by Clock component
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

- [ ] 6.1 Write property test for weather data display persistence
  - **Property 8: Weather Data Display Persistence**
  - **Validates: Requirements 4.3, 4.4, 4.5, 4.6**

- [x] 7. Add moon phase calculation and display
  - Implement moon phase calculation algorithm based on current date
  - Fetch moon phase data as part of weather service updates
  - Position moon phase indicator on clock face in non-intrusive location
  - Update moon phase display at hourly intervals
  - _Requirements: 4.2, 4.5, 12.5_

- [-] 8. Implement intelligent background dimming system
  - Create Dimming_Controller module to calculate sunrise/sunset times
  - Calculate dimming level based on current time relative to sunrise/sunset
  - Implement smooth opacity transitions during 30-minute periods after sunset and before sunrise
  - Apply full opacity between sunrise and sunset
  - Update dimming continuously as time progresses
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8.1 Write property test for sunrise-sunset based dimming
  - **Property 9: Sunrise-Sunset Based Dimming**
  - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

- [ ] 9. Add dual calendar display (Hijri and Gregorian)
  - Position Gregorian date on clock face to remain readable after rotation
  - Position Hijri date on clock face to remain readable after rotation
  - Format both dates clearly and readably
  - Update both dates at midnight
  - Ensure dates don't overlap with other critical elements
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 9.1 Write property test for dual calendar display
  - **Property 10: Dual Calendar Display**
  - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 11. Update night fraction markers for semi-circular display
  - Modify marker rendering to only display markers within visible 180-degree range
  - Draw midnight marker at appropriate position with "1/2" label
  - Draw one-third night marker with "1/3" label
  - Draw two-thirds night marker with "2/3" label
  - Apply rotation transformation to all night fraction markers
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 11.1 Write property test for night fraction marker labeling
  - **Property 11: Night Fraction Marker Labeling**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [-] 12. Update alarm indicators for semi-circular display
  - Modify markAlarms function to only display indicators within visible 180-degree range
  - Maintain red color for regular alarms
  - Maintain yellowgreen color for nafl alarms
  - Apply rotation transformation to alarm indicators
  - Filter alarms based on frequency and current day
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 12.1 Write property test for alarm indicator positioning and color coding
  - **Property 12: Alarm Indicator Positioning and Color Coding**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [-] 13. Update hour labels for semi-circular display
  - Modify drawNumbers24 to display only 12 hour labels across 180-degree arc
  - Distribute hour labels evenly at 15-degree intervals
  - Format labels in 12-hour format with AM/PM indicators
  - Position labels at outer edge of clock arc
  - Rotate labels to remain upright and readable
  - Update minute tick marks for semi-circular layout
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 13.1 Write property test for hour label formatting and positioning
  - **Property 13: Hour Label Formatting and Positioning**
  - **Validates: Requirements 9.2, 9.3, 9.4**

- [-] 14. Implement responsive scaling for all visual elements
  - Update all drawing functions to scale proportionally based on radius
  - Ensure prayer bands scale correctly
  - Ensure text sizes scale appropriately
  - Ensure markers and indicators scale proportionally
  - Test scaling on different screen sizes and orientations
  - _Requirements: 10.4, 10.5_

- [ ] 14.1 Write property test for proportional element scaling
  - **Property 14: Proportional Element Scaling**
  - **Validates: Requirements 10.5**

- [-] 15. Preserve existing functionality
  - Verify screen saver drift functionality works with semi-circular layout
  - Verify drag-to-reposition functionality works correctly
  - Verify click-to-toggle-menu functionality is preserved
  - Verify zoom functionality works with semi-circular display
  - Ensure elapsed time and next prayer countdown display correctly
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 15.1 Write property test for prayer countdown display
  - **Property 15: Prayer Countdown Display**
  - **Validates: Requirements 11.5**

- [x] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Implement visual hierarchy and styling
  - Define consistent color scheme for all visual elements
  - Apply font size hierarchy (current time > prayer name > dates > other text)
  - Ensure text contrast meets minimum readability ratios against all backgrounds
  - Position weather data and moon phase in non-intrusive locations
  - Verify no overlapping of critical elements
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 17.1 Write property test for visual hierarchy consistency
  - **Property 16: Visual Hierarchy Consistency**
  - **Validates: Requirements 12.1, 12.2, 12.3**

- [ ] 17.2 Write property test for non-overlapping information placement
  - **Property 17: Non-Overlapping Information Placement**
  - **Validates: Requirements 12.4, 12.5**

- [ ] 18. Final integration and testing
  - Wire all components together in Clock.js
  - Test complete clock rendering with all features
  - Verify smooth transitions and animations
  - Test on different screen sizes and orientations
  - Verify all existing functionality is preserved
  - _Requirements: All_

- [ ] 18.1 Write integration tests for complete clock rendering
  - Test end-to-end clock rendering with all features enabled
  - Test clock behavior across different times of day
  - Test clock behavior with different prayer schedules
  - _Requirements: All_

- [ ] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- Integration tests validate end-to-end functionality
- The implementation builds incrementally, with each task adding functionality on top of previous work
- Weather service integration is independent and can be developed in parallel with visual updates
- All existing functionality must be preserved throughout the redesign
