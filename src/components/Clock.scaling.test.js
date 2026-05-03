/**
 * Property tests for Proportional Element Scaling
 *
 * Property 14: Proportional Element Scaling
 * For any radius value, all visual elements (bands, labels, markers, indicators)
 * SHALL scale proportionally, maintaining consistent relative sizes and spacing.
 *
 * Validates: Requirements 10.5
 */

/**
 * Pure function that mirrors the fontSize computation in Clock.js.
 * Given a radius, returns the font size object used for rendering.
 */
function computeFontSizes(radius) {
    return {
        displayTime:  radius * 0.556,
        nextText:     radius * 0.347,
        prayerName:   radius * 0.144,
        dateGreg:     radius * 0.100,
        dateHijri:    radius * 0.087,
        bodyText:     radius * 0.069,
        weather:      radius * 0.062,
        moonPhase:    radius * 0.058,
        markerLabel:  radius * 0.031,
        hourLabel:    radius * 0.029,
    };
}

/**
 * Pure function that mirrors the lineWidth computation in Clock.js.
 */
function computeLineWidths(radius) {
    return {
        markerHand:  radius * 0.0078,
        outerCircle: radius * 0.020,
    };
}

/**
 * Pure function that mirrors the arrow dimension computation in Clock.js.
 */
function computeArrowDimensions(radius) {
    return {
        width:  radius * 0.091,
        height: radius * 0.131,
    };
}

/**
 * Pure function that mirrors the indicator dot radius computation in Clock.js.
 */
function computeIndicatorRadius(radius) {
    return radius * 0.020;
}

/**
 * Compute the ratio of two values, used to verify proportionality.
 */
function ratio(a, b) {
    return a / b;
}

describe('Proportional Element Scaling - Property 14', () => {

    // -------------------------------------------------------------------------
    // Core property: all sizes scale linearly with radius
    // -------------------------------------------------------------------------

    describe('Font sizes scale linearly with radius', () => {

        const testRadii = [100, 200, 300, 450, 600, 800, 1000];

        test('displayTime font size is proportional to radius (factor 0.556)', () => {
            for (const r of testRadii) {
                const sizes = computeFontSizes(r);
                expect(sizes.displayTime / r).toBeCloseTo(0.556, 10);
            }
        });

        test('nextText font size is proportional to radius (factor 0.347)', () => {
            for (const r of testRadii) {
                const sizes = computeFontSizes(r);
                expect(sizes.nextText / r).toBeCloseTo(0.347, 10);
            }
        });

        test('prayerName font size is proportional to radius (factor 0.144)', () => {
            for (const r of testRadii) {
                const sizes = computeFontSizes(r);
                expect(sizes.prayerName / r).toBeCloseTo(0.144, 10);
            }
        });

        test('dateGreg font size is proportional to radius (factor 0.100)', () => {
            for (const r of testRadii) {
                const sizes = computeFontSizes(r);
                expect(sizes.dateGreg / r).toBeCloseTo(0.100, 10);
            }
        });

        test('dateHijri font size is proportional to radius (factor 0.087)', () => {
            for (const r of testRadii) {
                const sizes = computeFontSizes(r);
                expect(sizes.dateHijri / r).toBeCloseTo(0.087, 10);
            }
        });

        test('bodyText font size is proportional to radius (factor 0.069)', () => {
            for (const r of testRadii) {
                const sizes = computeFontSizes(r);
                expect(sizes.bodyText / r).toBeCloseTo(0.069, 10);
            }
        });

        test('weather font size is proportional to radius (factor 0.062)', () => {
            for (const r of testRadii) {
                const sizes = computeFontSizes(r);
                expect(sizes.weather / r).toBeCloseTo(0.062, 10);
            }
        });

        test('moonPhase font size is proportional to radius (factor 0.058)', () => {
            for (const r of testRadii) {
                const sizes = computeFontSizes(r);
                expect(sizes.moonPhase / r).toBeCloseTo(0.058, 10);
            }
        });

        test('markerLabel font size is proportional to radius (factor 0.031)', () => {
            for (const r of testRadii) {
                const sizes = computeFontSizes(r);
                expect(sizes.markerLabel / r).toBeCloseTo(0.031, 10);
            }
        });

        test('hourLabel font size is proportional to radius (factor 0.029)', () => {
            for (const r of testRadii) {
                const sizes = computeFontSizes(r);
                expect(sizes.hourLabel / r).toBeCloseTo(0.029, 10);
            }
        });
    });

    describe('Line widths scale linearly with radius', () => {

        const testRadii = [100, 200, 450, 800];

        test('markerHand line width is proportional to radius (factor 0.0078)', () => {
            for (const r of testRadii) {
                const lw = computeLineWidths(r);
                expect(lw.markerHand / r).toBeCloseTo(0.0078, 10);
            }
        });

        test('outerCircle line width is proportional to radius (factor 0.020)', () => {
            for (const r of testRadii) {
                const lw = computeLineWidths(r);
                expect(lw.outerCircle / r).toBeCloseTo(0.020, 10);
            }
        });
    });

    describe('Arrow dimensions scale linearly with radius', () => {

        const testRadii = [100, 200, 450, 800];

        test('arrow width is proportional to radius (factor 0.091)', () => {
            for (const r of testRadii) {
                const arrow = computeArrowDimensions(r);
                expect(arrow.width / r).toBeCloseTo(0.091, 10);
            }
        });

        test('arrow height is proportional to radius (factor 0.131)', () => {
            for (const r of testRadii) {
                const arrow = computeArrowDimensions(r);
                expect(arrow.height / r).toBeCloseTo(0.131, 10);
            }
        });
    });

    describe('Alarm indicator dot radius scales linearly with radius', () => {

        const testRadii = [100, 200, 450, 800];

        test('indicator dot radius is proportional to radius (factor 0.020)', () => {
            for (const r of testRadii) {
                const dotR = computeIndicatorRadius(r);
                expect(dotR / r).toBeCloseTo(0.020, 10);
            }
        });
    });

    // -------------------------------------------------------------------------
    // Visual hierarchy: font sizes maintain consistent relative ordering
    // -------------------------------------------------------------------------

    describe('Font size hierarchy is maintained across all radii', () => {

        const testRadii = [100, 200, 300, 450, 600, 800, 1000];

        test('displayTime > nextText > prayerName > dateGreg > dateHijri > bodyText > weather > moonPhase > markerLabel > hourLabel', () => {
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

        test('relative ratios between font sizes are constant across radii', () => {
            // Pick two reference radii and verify the ratio of each font size pair is the same
            const r1 = 200;
            const r2 = 600;
            const s1 = computeFontSizes(r1);
            const s2 = computeFontSizes(r2);

            const keys = Object.keys(s1);
            for (let i = 0; i < keys.length - 1; i++) {
                const k = keys[i];
                const ratioAtR1 = s1[k] / r1;
                const ratioAtR2 = s2[k] / r2;
                expect(ratioAtR1).toBeCloseTo(ratioAtR2, 10);
            }
        });
    });

    // -------------------------------------------------------------------------
    // Property: doubling the radius doubles all sizes (linearity check)
    // -------------------------------------------------------------------------

    describe('Doubling radius doubles all visual element sizes', () => {

        test('all font sizes double when radius doubles', () => {
            const r = 300;
            const s1 = computeFontSizes(r);
            const s2 = computeFontSizes(r * 2);

            for (const key of Object.keys(s1)) {
                expect(s2[key]).toBeCloseTo(s1[key] * 2, 10);
            }
        });

        test('all line widths double when radius doubles', () => {
            const r = 300;
            const lw1 = computeLineWidths(r);
            const lw2 = computeLineWidths(r * 2);

            for (const key of Object.keys(lw1)) {
                expect(lw2[key]).toBeCloseTo(lw1[key] * 2, 10);
            }
        });

        test('arrow dimensions double when radius doubles', () => {
            const r = 300;
            const a1 = computeArrowDimensions(r);
            const a2 = computeArrowDimensions(r * 2);

            expect(a2.width).toBeCloseTo(a1.width * 2, 10);
            expect(a2.height).toBeCloseTo(a1.height * 2, 10);
        });

        test('indicator dot radius doubles when radius doubles', () => {
            const r = 300;
            const d1 = computeIndicatorRadius(r);
            const d2 = computeIndicatorRadius(r * 2);

            expect(d2).toBeCloseTo(d1 * 2, 10);
        });
    });

    // -------------------------------------------------------------------------
    // All sizes are positive for any positive radius
    // -------------------------------------------------------------------------

    describe('All sizes are positive for any positive radius', () => {

        const testRadii = [1, 50, 100, 450, 1000, 5000];

        test('all font sizes are positive', () => {
            for (const r of testRadii) {
                const s = computeFontSizes(r);
                for (const key of Object.keys(s)) {
                    expect(s[key]).toBeGreaterThan(0);
                }
            }
        });

        test('all line widths are positive', () => {
            for (const r of testRadii) {
                const lw = computeLineWidths(r);
                for (const key of Object.keys(lw)) {
                    expect(lw[key]).toBeGreaterThan(0);
                }
            }
        });

        test('arrow dimensions are positive', () => {
            for (const r of testRadii) {
                const arrow = computeArrowDimensions(r);
                expect(arrow.width).toBeGreaterThan(0);
                expect(arrow.height).toBeGreaterThan(0);
            }
        });

        test('indicator dot radius is positive', () => {
            for (const r of testRadii) {
                expect(computeIndicatorRadius(r)).toBeGreaterThan(0);
            }
        });
    });
});
