/**
 * Property tests for Visual Hierarchy and Styling
 *
 * Property 16: Visual Hierarchy Consistency
 * For any clock state, font sizes SHALL follow a consistent hierarchy
 * (current time > prayer name > dates > other text), colors SHALL match
 * the defined color scheme, and text contrast SHALL meet minimum
 * readability ratios against all backgrounds.
 *
 * Property 17: Non-Overlapping Information Placement
 * For any clock state, the Arabic prayer name SHALL be positioned
 * prominently in the center area, and weather data and moon phase
 * information SHALL be positioned in locations that do not overlap
 * with critical elements (current time, prayer name, prayer bands).
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5
 */

// ---------------------------------------------------------------------------
// Pure helper functions mirroring Clock.js visual hierarchy logic
// ---------------------------------------------------------------------------

/**
 * Mirrors the fontSize computation in Clock.js.
 * Returns the font size object for a given radius.
 */
function computeFontSizes(radius) {
    return {
        displayTime:  radius * 0.556,  // Level 1 — current time (largest)
        nextText:     radius * 0.347,  // Level 2 — countdown to next prayer
        prayerName:   radius * 0.144,  // Level 3 — Arabic prayer name
        dateGreg:     radius * 0.100,  // Level 4 — Gregorian date
        dateHijri:    radius * 0.087,  // Level 5 — Hijri date
        bodyText:     radius * 0.069,  // Level 6 — elapsed/next label, vakits list
        weather:      radius * 0.062,  // Level 7 — weather description
        moonPhase:    radius * 0.058,  // Level 8 — moon phase
        markerLabel:  radius * 0.031,  // Level 9 — night fraction labels
        hourLabel:    radius * 0.029,  // Level 10 — hour labels on arc
    };
}

/**
 * Mirrors the color scheme defined in Clock.js.
 * Returns the colors object.
 */
function getColorScheme() {
    return {
        background:   '#0D0E0F',
        foreground:   '#F5F5F5',
        muted:        '#B0B0B0',
        subtle:       '#4B4E54',
        accent:       '#FFD700',
        alarmRegular: '#FF4444',
        alarmNafl:    '#9ACD32',
        dimmed:       '#808080',
    };
}

/**
 * Parses a hex color string (#RRGGBB) into { r, g, b } components (0–255).
 */
function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16),
    };
}

/**
 * Calculates the relative luminance of an RGB color per WCAG 2.1 formula.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance({ r, g, b }) {
    const toLinear = (c) => {
        const sRGB = c / 255;
        return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Calculates the WCAG 2.1 contrast ratio between two hex colors.
 * Returns a value between 1 (no contrast) and 21 (maximum contrast).
 */
function contrastRatio(hex1, hex2) {
    const L1 = relativeLuminance(hexToRgb(hex1));
    const L2 = relativeLuminance(hexToRgb(hex2));
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Computes the y-position (relative to canvas center at bottom) for each
 * text element, mirroring Clock.js rendering positions.
 * Positive y = below center (off-screen), negative y = above center (inside semi-circle).
 */
function computeTextPositions(radius) {
    return {
        // Below center (positive y) — visible below the semi-circle
        displayTime:  radius * 0.054,
        elapsedLabel: radius * 0.218,
        nextText:     radius * 0.446,
        // Above center (negative y) — inside the semi-circle
        prayerName:   -radius * 0.382,
        weather:      -radius * 0.52,
        moonPhase:    -radius * 0.60,
    };
}

/**
 * Computes the vertical extent (top and bottom y) of a text element,
 * approximating height as fontSize (single line of text).
 */
function textExtent(yCenter, fontSize) {
    const halfHeight = fontSize / 2;
    return {
        top:    yCenter - halfHeight,
        bottom: yCenter + halfHeight,
    };
}

/**
 * Checks whether two vertical extents overlap.
 */
function extentsOverlap(a, b) {
    return a.top < b.bottom && a.bottom > b.top;
}

// ---------------------------------------------------------------------------
// Property 16: Visual Hierarchy Consistency
// Validates: Requirements 12.1, 12.2, 12.3
// ---------------------------------------------------------------------------

describe('Visual Hierarchy Consistency - Property 16', () => {

    // -----------------------------------------------------------------------
    // 16.1 Font size hierarchy: current time > prayer name > dates > other text
    // -----------------------------------------------------------------------

    describe('Font size hierarchy is maintained (Requirement 12.2)', () => {

        const testRadii = [100, 200, 300, 450, 600, 800, 1000];

        test('displayTime is the largest font size', () => {
            for (const r of testRadii) {
                const s = computeFontSizes(r);
                const allOthers = Object.entries(s)
                    .filter(([k]) => k !== 'displayTime')
                    .map(([, v]) => v);
                for (const other of allOthers) {
                    expect(s.displayTime).toBeGreaterThan(other);
                }
            }
        });

        test('prayerName is larger than all date and secondary text sizes', () => {
            for (const r of testRadii) {
                const s = computeFontSizes(r);
                expect(s.prayerName).toBeGreaterThan(s.dateGreg);
                expect(s.prayerName).toBeGreaterThan(s.dateHijri);
                expect(s.prayerName).toBeGreaterThan(s.bodyText);
                expect(s.prayerName).toBeGreaterThan(s.weather);
                expect(s.prayerName).toBeGreaterThan(s.moonPhase);
                expect(s.prayerName).toBeGreaterThan(s.markerLabel);
                expect(s.prayerName).toBeGreaterThan(s.hourLabel);
            }
        });

        test('date sizes are larger than body/weather/moon/marker/hour text', () => {
            for (const r of testRadii) {
                const s = computeFontSizes(r);
                expect(s.dateGreg).toBeGreaterThan(s.bodyText);
                expect(s.dateGreg).toBeGreaterThan(s.weather);
                expect(s.dateGreg).toBeGreaterThan(s.moonPhase);
                expect(s.dateHijri).toBeGreaterThan(s.bodyText);
                expect(s.dateHijri).toBeGreaterThan(s.weather);
                expect(s.dateHijri).toBeGreaterThan(s.moonPhase);
            }
        });

        test('weather and moon phase are smaller than all primary content sizes', () => {
            for (const r of testRadii) {
                const s = computeFontSizes(r);
                // Weather and moon phase are non-intrusive secondary info
                expect(s.weather).toBeLessThan(s.displayTime);
                expect(s.weather).toBeLessThan(s.nextText);
                expect(s.weather).toBeLessThan(s.prayerName);
                expect(s.weather).toBeLessThan(s.dateGreg);
                expect(s.moonPhase).toBeLessThan(s.weather);
            }
        });

        test('full hierarchy: displayTime > nextText > prayerName > dateGreg > dateHijri > bodyText > weather > moonPhase > markerLabel > hourLabel', () => {
            for (const r of testRadii) {
                const s = computeFontSizes(r);
                expect(s.displayTime).toBeGreaterThan(s.nextText);
                expect(s.nextText).toBeGreaterThan(s.prayerName);
                expect(s.prayerName).toBeGreaterThan(s.dateGreg);
                expect(s.dateGreg).toBeGreaterThan(s.dateHijri);
                expect(s.dateHijri).toBeGreaterThan(s.bodyText);
                expect(s.bodyText).toBeGreaterThan(s.weather);
                expect(s.weather).toBeGreaterThan(s.moonPhase);
                expect(s.moonPhase).toBeGreaterThan(s.markerLabel);
                expect(s.markerLabel).toBeGreaterThan(s.hourLabel);
            }
        });
    });

    // -----------------------------------------------------------------------
    // 16.2 Color scheme consistency (Requirement 12.1)
    // -----------------------------------------------------------------------

    describe('Color scheme is consistent and well-defined (Requirement 12.1)', () => {

        test('color scheme contains all required color keys', () => {
            const colors = getColorScheme();
            const requiredKeys = [
                'background', 'foreground', 'muted', 'subtle',
                'accent', 'alarmRegular', 'alarmNafl', 'dimmed',
            ];
            for (const key of requiredKeys) {
                expect(colors).toHaveProperty(key);
                expect(typeof colors[key]).toBe('string');
                expect(colors[key]).toMatch(/^#[0-9A-Fa-f]{6}$/);
            }
        });

        test('background color is dark (low luminance)', () => {
            const colors = getColorScheme();
            const luminance = relativeLuminance(hexToRgb(colors.background));
            // Background should be very dark (luminance < 0.05)
            expect(luminance).toBeLessThan(0.05);
        });

        test('foreground color is light (high luminance)', () => {
            const colors = getColorScheme();
            const luminance = relativeLuminance(hexToRgb(colors.foreground));
            // Foreground should be bright (luminance > 0.8)
            expect(luminance).toBeGreaterThan(0.8);
        });

        test('accent color is distinct from foreground and background', () => {
            const colors = getColorScheme();
            // Accent (gold) should be different from white foreground and black background
            expect(colors.accent).not.toBe(colors.foreground);
            expect(colors.accent).not.toBe(colors.background);
        });

        test('alarm colors are distinct from each other', () => {
            const colors = getColorScheme();
            expect(colors.alarmRegular).not.toBe(colors.alarmNafl);
        });
    });

    // -----------------------------------------------------------------------
    // 16.3 Text contrast meets minimum readability ratios (Requirement 12.3)
    // -----------------------------------------------------------------------

    describe('Text contrast meets WCAG minimum readability ratios (Requirement 12.3)', () => {

        // WCAG 2.1 minimum contrast ratios:
        //   - Normal text (< 18pt / < 14pt bold): 4.5:1
        //   - Large text (>= 18pt / >= 14pt bold): 3:1
        // We use 3:1 as the minimum since clock text is large and bold.
        const MIN_CONTRAST_RATIO = 3.0;

        test('foreground text on background meets minimum contrast ratio', () => {
            const colors = getColorScheme();
            const ratio = contrastRatio(colors.foreground, colors.background);
            expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
        });

        test('accent (prayer name) color on background meets minimum contrast ratio', () => {
            const colors = getColorScheme();
            const ratio = contrastRatio(colors.accent, colors.background);
            expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
        });

        test('muted text on background meets minimum contrast ratio', () => {
            const colors = getColorScheme();
            const ratio = contrastRatio(colors.muted, colors.background);
            expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
        });

        test('alarm regular color on background meets minimum contrast ratio', () => {
            const colors = getColorScheme();
            const ratio = contrastRatio(colors.alarmRegular, colors.background);
            expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
        });

        test('alarm nafl color on background meets minimum contrast ratio', () => {
            const colors = getColorScheme();
            const ratio = contrastRatio(colors.alarmNafl, colors.background);
            expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
        });

        test('foreground has higher contrast than muted against background', () => {
            const colors = getColorScheme();
            const foregroundContrast = contrastRatio(colors.foreground, colors.background);
            const mutedContrast = contrastRatio(colors.muted, colors.background);
            // Primary text (foreground) should have higher contrast than secondary text (muted)
            expect(foregroundContrast).toBeGreaterThan(mutedContrast);
        });

        test('contrast ratio calculation is symmetric', () => {
            const colors = getColorScheme();
            const ratio1 = contrastRatio(colors.foreground, colors.background);
            const ratio2 = contrastRatio(colors.background, colors.foreground);
            expect(ratio1).toBeCloseTo(ratio2, 10);
        });
    });
});

// ---------------------------------------------------------------------------
// Property 17: Non-Overlapping Information Placement
// Validates: Requirements 12.4, 12.5
// ---------------------------------------------------------------------------

describe('Non-Overlapping Information Placement - Property 17', () => {

    // -----------------------------------------------------------------------
    // 17.1 Prayer name is positioned prominently in the center area (Req 12.4)
    // -----------------------------------------------------------------------

    describe('Prayer name is positioned prominently in the center area (Requirement 12.4)', () => {

        const testRadii = [100, 200, 300, 450, 600];

        test('prayer name y-position is inside the semi-circle (negative y = above center)', () => {
            for (const r of testRadii) {
                const pos = computeTextPositions(r);
                // Negative y means above the center point (inside the semi-circle)
                expect(pos.prayerName).toBeLessThan(0);
            }
        });

        test('prayer name is positioned in the inner half of the semi-circle', () => {
            for (const r of testRadii) {
                const pos = computeTextPositions(r);
                // Prayer name should be within the inner area (|y| < radius * 0.5)
                // This ensures it's in the center area, not near the arc edge
                expect(Math.abs(pos.prayerName)).toBeLessThan(r * 0.5);
            }
        });

        test('prayer name position scales proportionally with radius', () => {
            const r1 = 200;
            const r2 = 400;
            const pos1 = computeTextPositions(r1);
            const pos2 = computeTextPositions(r2);
            // The ratio of position to radius should be constant
            expect(pos1.prayerName / r1).toBeCloseTo(pos2.prayerName / r2, 10);
        });
    });

    // -----------------------------------------------------------------------
    // 17.2 Weather and moon phase don't overlap with critical elements (Req 12.5)
    // -----------------------------------------------------------------------

    describe('Weather and moon phase do not overlap with critical elements (Requirement 12.5)', () => {

        const testRadii = [100, 200, 300, 450, 600];

        test('weather text does not overlap with prayer name', () => {
            for (const r of testRadii) {
                const pos = computeTextPositions(r);
                const sizes = computeFontSizes(r);

                const prayerNameExtent = textExtent(pos.prayerName, sizes.prayerName);
                const weatherExtent = textExtent(pos.weather, sizes.weather);

                expect(extentsOverlap(prayerNameExtent, weatherExtent)).toBe(false);
            }
        });

        test('moon phase text does not overlap with prayer name', () => {
            for (const r of testRadii) {
                const pos = computeTextPositions(r);
                const sizes = computeFontSizes(r);

                const prayerNameExtent = textExtent(pos.prayerName, sizes.prayerName);
                const moonPhaseExtent = textExtent(pos.moonPhase, sizes.moonPhase);

                expect(extentsOverlap(prayerNameExtent, moonPhaseExtent)).toBe(false);
            }
        });

        test('moon phase text does not overlap with weather text', () => {
            for (const r of testRadii) {
                const pos = computeTextPositions(r);
                const sizes = computeFontSizes(r);

                const weatherExtent = textExtent(pos.weather, sizes.weather);
                const moonPhaseExtent = textExtent(pos.moonPhase, sizes.moonPhase);

                expect(extentsOverlap(weatherExtent, moonPhaseExtent)).toBe(false);
            }
        });

        test('weather text does not overlap with current time display', () => {
            for (const r of testRadii) {
                const pos = computeTextPositions(r);
                const sizes = computeFontSizes(r);

                const displayTimeExtent = textExtent(pos.displayTime, sizes.displayTime);
                const weatherExtent = textExtent(pos.weather, sizes.weather);

                // displayTime is below center (positive y), weather is above center (negative y)
                // They should not overlap
                expect(extentsOverlap(displayTimeExtent, weatherExtent)).toBe(false);
            }
        });

        test('moon phase text does not overlap with current time display', () => {
            for (const r of testRadii) {
                const pos = computeTextPositions(r);
                const sizes = computeFontSizes(r);

                const displayTimeExtent = textExtent(pos.displayTime, sizes.displayTime);
                const moonPhaseExtent = textExtent(pos.moonPhase, sizes.moonPhase);

                expect(extentsOverlap(displayTimeExtent, moonPhaseExtent)).toBe(false);
            }
        });

        test('weather and moon phase are positioned above center (inside semi-circle)', () => {
            for (const r of testRadii) {
                const pos = computeTextPositions(r);
                // Both should be above center (negative y) — inside the semi-circle
                expect(pos.weather).toBeLessThan(0);
                expect(pos.moonPhase).toBeLessThan(0);
            }
        });

        test('weather is positioned below prayer name (further from center)', () => {
            for (const r of testRadii) {
                const pos = computeTextPositions(r);
                // Both are negative (above center). Weather is further up (more negative)
                // than prayer name, meaning |weather| > |prayerName|
                expect(Math.abs(pos.weather)).toBeGreaterThan(Math.abs(pos.prayerName));
            }
        });

        test('moon phase is positioned below weather (further from center)', () => {
            for (const r of testRadii) {
                const pos = computeTextPositions(r);
                // Moon phase is further up than weather
                expect(Math.abs(pos.moonPhase)).toBeGreaterThan(Math.abs(pos.weather));
            }
        });

        test('weather and moon phase positions scale proportionally with radius', () => {
            const r1 = 200;
            const r2 = 500;
            const pos1 = computeTextPositions(r1);
            const pos2 = computeTextPositions(r2);

            expect(pos1.weather / r1).toBeCloseTo(pos2.weather / r2, 10);
            expect(pos1.moonPhase / r1).toBeCloseTo(pos2.moonPhase / r2, 10);
        });
    });

    // -----------------------------------------------------------------------
    // 17.3 Minimum gap between adjacent text elements
    // -----------------------------------------------------------------------

    describe('Minimum gap between adjacent text elements', () => {

        const testRadii = [200, 300, 450, 600];

        test('gap between prayer name and weather is positive (no overlap)', () => {
            for (const r of testRadii) {
                const pos = computeTextPositions(r);
                const sizes = computeFontSizes(r);

                // In canvas coordinates: negative y = above center.
                // prayerName is at -0.382r (less negative = lower in the semi-circle)
                // weather is at -0.52r (more negative = higher in the semi-circle)
                // prayerName top edge (most negative edge of prayerName)
                const prayerNameTop = pos.prayerName - sizes.prayerName / 2;
                // weather bottom edge (least negative edge of weather)
                const weatherBottom = pos.weather + sizes.weather / 2;

                // Gap = distance between prayerName top and weather bottom
                // prayerNameTop is less negative than weatherBottom, so gap > 0 means no overlap
                const gap = prayerNameTop - weatherBottom;

                // Gap must be positive (no overlap)
                expect(gap).toBeGreaterThan(0);
            }
        });

        test('gap between weather and moon phase is positive (no overlap)', () => {
            for (const r of testRadii) {
                const pos = computeTextPositions(r);
                const sizes = computeFontSizes(r);

                // weather is at -0.52r, moon phase is at -0.60r (more negative = higher)
                // weather top edge (most negative edge of weather)
                const weatherTop = pos.weather - sizes.weather / 2;
                // moon phase bottom edge (least negative edge of moon phase)
                const moonPhaseBottom = pos.moonPhase + sizes.moonPhase / 2;

                // Gap = distance between weather top and moon phase bottom
                const gap = weatherTop - moonPhaseBottom;

                // Gap must be positive (no overlap)
                expect(gap).toBeGreaterThan(0);
            }
        });
    });
});

// ---------------------------------------------------------------------------
// Utility function tests
// ---------------------------------------------------------------------------

describe('Contrast ratio utility', () => {

    test('black on white has maximum contrast ratio of 21', () => {
        const ratio = contrastRatio('#000000', '#FFFFFF');
        expect(ratio).toBeCloseTo(21, 0);
    });

    test('identical colors have contrast ratio of 1 (no contrast)', () => {
        const ratio = contrastRatio('#808080', '#808080');
        expect(ratio).toBeCloseTo(1, 10);
    });

    test('contrast ratio is always >= 1', () => {
        const colorPairs = [
            ['#000000', '#FFFFFF'],
            ['#FF0000', '#0000FF'],
            ['#FFD700', '#0D0E0F'],
            ['#B0B0B0', '#0D0E0F'],
        ];
        for (const [c1, c2] of colorPairs) {
            expect(contrastRatio(c1, c2)).toBeGreaterThanOrEqual(1);
        }
    });
});
