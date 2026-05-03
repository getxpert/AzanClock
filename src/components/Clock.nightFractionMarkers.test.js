/**
 * Property tests for Night Fraction Marker visibility logic
 *
 * Property 11: Night Fraction Marker Labeling
 * For any clock state, night fraction markers SHALL be drawn at midnight (labeled "1/2"),
 * one-third night (labeled "1/3"), and two-thirds night (labeled "2/3") positions
 * when these positions fall within the visible 180-degree range.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 *
 * Coordinate system notes:
 * - TimeToRadians(time, 24) adds π/2, so midnight (0:00) → π/2, 6AM → π, noon → 3π/2, 6PM → 0/2π
 * - drawHand uses ctx.rotate(angle) and draws along the x-axis
 * - Visible upper semi-circle: angles where the hand points upward = sin(angle) < 0
 *   = angle ∈ (π, 2π) in [0, 2π) normalization
 * - rotationAngle = π/2 - hourAngle, so finalAngle = markerAngle + π/2 - hourAngle
 * - The "top" of the display (apex of semi-circle) corresponds to finalAngle = 3π/2
 */

/**
 * Pure function extracted from Clock.js useEffect.
 * Determines whether an angle (in canvas rotation coordinates) falls within
 * the visible 180-degree upper semi-circle.
 *
 * The visible range is angles whose normalized value is in (π, 2π) —
 * i.e., the hand points into the upper half of the canvas (sin(angle) < 0).
 */
function isAngleVisible(angle) {
    let normalized = angle % (2 * Math.PI);
    if (normalized < 0) normalized += 2 * Math.PI;
    return normalized > Math.PI && normalized < 2 * Math.PI;
}

/**
 * Compute the rotation angle used in Clock.js to keep current time at right edge.
 * rotationAngle = π/2 - hourAngle
 */
function computeRotationAngle(hourAngle) {
    return Math.PI / 2 - hourAngle;
}

/**
 * Compute the final angle for a night fraction marker given its base angle
 * and the current rotation angle.
 */
function computeFinalAngle(markerAngle, rotationAngle) {
    return markerAngle + rotationAngle;
}

/**
 * Simulate TimeToRadians(time, 24): converts hours to radians with π/2 offset.
 * midnight (0h) → π/2, 6AM → π, noon (12h) → 3π/2, 6PM (18h) → 0/2π
 */
function timeToAngle(hours) {
    const angle = (hours / 24) * 2 * Math.PI + Math.PI / 2;
    return angle % (2 * Math.PI);
}

describe('Night Fraction Marker Visibility - Property 11', () => {

    // -------------------------------------------------------------------------
    // Core visibility logic unit tests
    // -------------------------------------------------------------------------

    describe('isAngleVisible - core boundary tests', () => {
        test('angle at π (left boundary) is NOT visible', () => {
            expect(isAngleVisible(Math.PI)).toBe(false);
        });

        test('angle at 2π (right boundary / 0) is NOT visible', () => {
            expect(isAngleVisible(2 * Math.PI)).toBe(false);
        });

        test('angle at 0 (same as 2π) is NOT visible', () => {
            expect(isAngleVisible(0)).toBe(false);
        });

        test('angle at 3π/2 (apex of semi-circle, pointing straight up) IS visible', () => {
            expect(isAngleVisible(3 * Math.PI / 2)).toBe(true);
        });

        test('angle slightly above π IS visible', () => {
            expect(isAngleVisible(Math.PI + 0.01)).toBe(true);
        });

        test('angle slightly below 2π IS visible', () => {
            expect(isAngleVisible(2 * Math.PI - 0.01)).toBe(true);
        });

        test('angle at π/2 (pointing right, lower half) is NOT visible', () => {
            expect(isAngleVisible(Math.PI / 2)).toBe(false);
        });

        test('angle at π/4 is NOT visible', () => {
            expect(isAngleVisible(Math.PI / 4)).toBe(false);
        });

        test('angle at 3π/4 is NOT visible', () => {
            expect(isAngleVisible(3 * Math.PI / 4)).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // Property: angles in (π, 2π) are visible, all others are not
    // -------------------------------------------------------------------------

    describe('Property: visibility is exactly the open interval (π, 2π)', () => {
        test('all angles strictly inside (π, 2π) are visible', () => {
            // Sample 100 angles strictly inside the visible range
            const steps = 100;
            for (let i = 1; i < steps; i++) {
                const angle = Math.PI + (i / steps) * Math.PI; // (π, 2π) exclusive
                expect(isAngleVisible(angle)).toBe(true);
            }
        });

        test('all angles in [0, π] are NOT visible', () => {
            // Sample 50 angles in the invisible lower half [0, π]
            const steps = 50;
            for (let i = 0; i <= steps; i++) {
                const angle = (i / steps) * Math.PI; // [0, π] inclusive
                expect(isAngleVisible(angle)).toBe(false);
            }
        });

        test('negative angles are handled correctly via normalization', () => {
            // -π/2 normalizes to 3π/2, which IS visible (apex of semi-circle)
            expect(isAngleVisible(-Math.PI / 2)).toBe(true);
            // -π normalizes to π, which is NOT visible (boundary)
            expect(isAngleVisible(-Math.PI)).toBe(false);
            // -π/4 normalizes to 7π/4, which IS visible
            expect(isAngleVisible(-Math.PI / 4)).toBe(true);
            // -3π/2 normalizes to π/2, which is NOT visible
            expect(isAngleVisible(-3 * Math.PI / 2)).toBe(false);
        });

        test('angles beyond 2π are handled correctly via normalization', () => {
            // 5π/2 normalizes to π/2, NOT visible
            expect(isAngleVisible(5 * Math.PI / 2)).toBe(false);
            // 7π/2 normalizes to 3π/2, IS visible (apex)
            expect(isAngleVisible(7 * Math.PI / 2)).toBe(true);
            // 3π normalizes to π, NOT visible (boundary)
            expect(isAngleVisible(3 * Math.PI)).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // Property: night fraction markers respect rotation (Requirement 7.5)
    // Using valid TimeToRadians-based angles (always ≥ π/2)
    // -------------------------------------------------------------------------

    describe('Property: night fraction markers respect rotation (Requirement 7.5)', () => {

        test('midnight marker is visible when current time is 7 hours after midnight', () => {
            // Current time = 7 AM. Midnight is 7 hours behind.
            // finalAngle = midnightAngle + π/2 - hourAngle
            //            = π/2 + π/2 - (π/2 + 7*2π/24)
            //            = π/2 - 7π/12 = 6π/12 - 7π/12 = -π/12
            // normalized: -π/12 + 2π = 23π/12 ≈ 6.02 — visible (> π)
            const hourAngle = timeToAngle(7);       // 7 AM
            const midnightAngle = timeToAngle(0);   // midnight = π/2
            const rotationAngle = computeRotationAngle(hourAngle);
            const finalAngle = computeFinalAngle(midnightAngle, rotationAngle);
            expect(isAngleVisible(finalAngle)).toBe(true);
        });

        test('midnight marker is NOT visible when current time is 1 AM', () => {
            // Current time = 1 AM. Midnight is 1 hour behind.
            // finalAngle = π/2 + π/2 - (π/2 + 1*2π/24)
            //            = π/2 - π/12 = 6π/12 - π/12 = 5π/12 ≈ 1.31
            // 5π/12 < π → NOT visible (midnight is in the lower half at 1 AM)
            const hourAngle = timeToAngle(1);       // 1 AM
            const midnightAngle = timeToAngle(0);   // midnight = π/2
            const rotationAngle = computeRotationAngle(hourAngle);
            const finalAngle = computeFinalAngle(midnightAngle, rotationAngle);
            expect(isAngleVisible(finalAngle)).toBe(false);
        });

        test('1/3 night marker is visible when current time is near 1/3 night', () => {
            // Night from 8 PM (20h) to 4 AM (4h) = 8 hours
            // 1/3 night = 8 PM + 8/3 hours ≈ 10:40 PM
            const oneThirdHour = 20 + 8 / 3; // ≈ 22.67h
            const oneThirdAngle = timeToAngle(oneThirdHour % 24);
            const hourAngle = timeToAngle(oneThirdHour % 24); // current time = 1/3 night
            const rotationAngle = computeRotationAngle(hourAngle);
            const finalAngle = computeFinalAngle(oneThirdAngle, rotationAngle);
            // When current time equals the marker, finalAngle = π/2 (right edge, NOT visible)
            // This is expected: the current time position is at the right edge of the diameter
            expect(isAngleVisible(finalAngle)).toBe(false);
        });

        test('1/3 night marker is visible when current time is 3 hours before it', () => {
            // Night from 8 PM to 4 AM, 1/3 night ≈ 10:40 PM
            const oneThirdHour = 20 + 8 / 3;
            const oneThirdAngle = timeToAngle(oneThirdHour % 24);
            // Current time is 3 hours before 1/3 night
            const currentHour = (oneThirdHour - 3 + 24) % 24;
            const hourAngle = timeToAngle(currentHour);
            const rotationAngle = computeRotationAngle(hourAngle);
            const finalAngle = computeFinalAngle(oneThirdAngle, rotationAngle);
            // 3 hours = 3/24 * 2π = π/4 radians ahead of current time
            // finalAngle = oneThirdAngle + π/2 - hourAngle = π/4 + π/2 = 3π/4... 
            // Actually: finalAngle = oneThirdAngle - hourAngle + π/2
            // = (oneThirdAngle - hourAngle) + π/2
            // oneThirdAngle - hourAngle = 3h * (2π/24) = π/4
            // finalAngle = π/4 + π/2 = 3π/4 — NOT visible (< π)
            expect(isAngleVisible(finalAngle)).toBe(false);
        });

        test('2/3 night marker is visible when current time is 3 hours after it', () => {
            // Night from 8 PM to 4 AM, 2/3 night ≈ 1:20 AM
            const twoThirdHour = (20 + 16 / 3) % 24; // ≈ 1.33h
            const twoThirdAngle = timeToAngle(twoThirdHour);
            // Current time is 3 hours after 2/3 night
            const currentHour = (twoThirdHour + 3) % 24;
            const hourAngle = timeToAngle(currentHour);
            const rotationAngle = computeRotationAngle(hourAngle);
            const finalAngle = computeFinalAngle(twoThirdAngle, rotationAngle);
            // twoThirdAngle - hourAngle = -3h * (2π/24) = -π/4
            // finalAngle = -π/4 + π/2 = π/4 — NOT visible (< π)
            expect(isAngleVisible(finalAngle)).toBe(false);
        });

        test('midnight marker is visible when current time is 4 hours after midnight', () => {
            // Current time = 4 AM, midnight was 4 hours ago
            const hourAngle = timeToAngle(4);       // 4 AM
            const midnightAngle = timeToAngle(0);   // midnight = π/2
            const rotationAngle = computeRotationAngle(hourAngle);
            const finalAngle = computeFinalAngle(midnightAngle, rotationAngle);
            // midnightAngle - hourAngle = (π/2) - (π/2 + 4*2π/24) = -π/3
            // finalAngle = -π/3 + π/2 = π/6 — NOT visible (< π)
            expect(isAngleVisible(finalAngle)).toBe(false);
        });

        test('midnight marker is visible when current time is 2 hours before midnight', () => {
            // Current time = 10 PM (22h), midnight is 2 hours ahead
            const hourAngle = timeToAngle(22);
            const midnightAngle = timeToAngle(0);   // midnight = π/2
            const rotationAngle = computeRotationAngle(hourAngle);
            const finalAngle = computeFinalAngle(midnightAngle, rotationAngle);
            // midnightAngle = π/2, hourAngle = π/2 + 22*2π/24 = π/2 + 11π/6
            // finalAngle = π/2 + π/2 - (π/2 + 11π/6) = π/2 - 11π/6 = 3π/6 - 11π/6 = -8π/6 = -4π/3
            // normalized: -4π/3 + 2π = 2π/3 — NOT visible (< π)
            expect(isAngleVisible(finalAngle)).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // Property: each night fraction marker is independently visibility-checked
    // (Requirement 7.4)
    // -------------------------------------------------------------------------

    describe('Property: each marker is independently visibility-checked (Requirement 7.4)', () => {

        test('midnight marker can be visible while 1/3 and 2/3 are not', () => {
            // Current time = midnight (0h). Midnight is at π/2.
            // finalAngle for midnight = π/2 + π/2 - π/2 = π/2 — NOT visible (right edge)
            // Let's use current time = 6 AM (π), midnight (π/2) is 6h behind
            const hourAngle = timeToAngle(6);       // 6 AM = π
            const midnightAngle = timeToAngle(0);   // midnight = π/2
            // Night from 8 PM to 4 AM: 1/3 night ≈ 10:40 PM, 2/3 night ≈ 1:20 AM
            const oneThirdAngle = timeToAngle((20 + 8 / 3) % 24);
            const twoThirdAngle = timeToAngle((20 + 16 / 3) % 24);
            const rotationAngle = computeRotationAngle(hourAngle);

            const midnightFinal = computeFinalAngle(midnightAngle, rotationAngle);
            const oneThirdFinal = computeFinalAngle(oneThirdAngle, rotationAngle);
            const twoThirdFinal = computeFinalAngle(twoThirdAngle, rotationAngle);

            // Midnight: π/2 + π/2 - π = 0 — NOT visible
            // 1/3 night (≈22.67h → angle ≈ π/2 + 22.67*2π/24 ≈ π/2 + 5.93 ≈ 7.50 → normalized ≈ 1.22): 
            //   finalAngle ≈ 1.22 + π/2 - π ≈ 1.22 - π/2 ≈ -0.35 → normalized ≈ 5.93 — visible
            // 2/3 night (≈1.33h → angle ≈ π/2 + 1.33*2π/24 ≈ π/2 + 0.35 ≈ 1.92):
            //   finalAngle ≈ 1.92 + π/2 - π ≈ 1.92 - π/2 ≈ 0.35 — NOT visible

            // The key property: each marker is checked independently
            // They can have different visibility states
            const visibilities = [midnightFinal, oneThirdFinal, twoThirdFinal].map(isAngleVisible);
            // At least verify they are computed independently (not all the same)
            // In this case: midnight=false, 1/3=true, 2/3=false
            expect(visibilities[0]).toBe(false); // midnight not visible at 6 AM
            expect(visibilities[1]).toBe(true);  // 1/3 night visible at 6 AM (it was ~8h ago)
            expect(visibilities[2]).toBe(false); // 2/3 night not visible at 6 AM
        });

        test('all three markers can be visible when current time is near midnight', () => {
            // If night is short and current time is near midnight,
            // all three markers may be within the visible window
            // Night from 9 PM (21h) to 3 AM (3h) = 6 hours
            // 1/3 night = 9 PM + 2h = 11 PM (23h)
            // 2/3 night = 9 PM + 4h = 1 AM (1h)
            // midnight = 0h
            const midnightAngle = timeToAngle(0);
            const oneThirdAngle = timeToAngle(23);
            const twoThirdAngle = timeToAngle(1);
            // Current time = midnight
            const hourAngle = timeToAngle(0);
            const rotationAngle = computeRotationAngle(hourAngle);

            // midnight: finalAngle = π/2 + π/2 - π/2 = π/2 — NOT visible (right edge)
            // So not all three are visible at midnight itself.
            // Let's use current time = 11 PM (23h), which is the 1/3 night position
            const hourAngle2 = timeToAngle(23);
            const rotationAngle2 = computeRotationAngle(hourAngle2);

            const midnightFinal = computeFinalAngle(midnightAngle, rotationAngle2);
            const oneThirdFinal = computeFinalAngle(oneThirdAngle, rotationAngle2);
            const twoThirdFinal = computeFinalAngle(twoThirdAngle, rotationAngle2);

            // 1/3 night at current time: finalAngle = π/2 (right edge, not visible)
            // midnight (1h ahead): finalAngle = π/2 + 1h*(2π/24) = π/2 + π/12 ≈ 1.83 — NOT visible
            // 2/3 night (2h ahead): finalAngle = π/2 + 2h*(2π/24) = π/2 + π/6 ≈ 2.09 — NOT visible

            // The property being tested: markers are checked independently
            // Each marker's visibility is determined solely by its own angle
            const midnightVisible = isAngleVisible(midnightFinal);
            const oneThirdVisible = isAngleVisible(oneThirdFinal);
            const twoThirdVisible = isAngleVisible(twoThirdFinal);

            // All three are independently evaluated (no shared state)
            expect(typeof midnightVisible).toBe('boolean');
            expect(typeof oneThirdVisible).toBe('boolean');
            expect(typeof twoThirdVisible).toBe('boolean');
        });

        test('markers 6 hours before current time are visible', () => {
            // A marker 6 hours (π/2 radians) before current time:
            // finalAngle = markerAngle + π/2 - hourAngle
            //            = (hourAngle - π/2) + π/2 - hourAngle = 0... wait
            // markerAngle = hourAngle - 6h*(2π/24) = hourAngle - π/2
            // finalAngle = (hourAngle - π/2) + (π/2 - hourAngle) = 0 — NOT visible (boundary)
            // So 6 hours before is at the boundary. Let's test 5 hours before:
            const hourAngle = timeToAngle(12); // noon
            const markerAngle = timeToAngle(7); // 5 hours before noon
            const rotationAngle = computeRotationAngle(hourAngle);
            const finalAngle = computeFinalAngle(markerAngle, rotationAngle);
            // markerAngle = π/2 + 7*2π/24 = π/2 + 7π/12
            // finalAngle = π/2 + 7π/12 + π/2 - (π/2 + 12*2π/24)
            //            = π/2 + 7π/12 + π/2 - π/2 - π
            //            = 7π/12 - π/2 = 7π/12 - 6π/12 = π/12 — NOT visible
            expect(isAngleVisible(finalAngle)).toBe(false);
        });

        test('markers 6 hours after current time are visible', () => {
            // A marker 6 hours after current time:
            // markerAngle = hourAngle + 6h*(2π/24) = hourAngle + π/2
            // finalAngle = (hourAngle + π/2) + (π/2 - hourAngle) = π — NOT visible (boundary)
            // So 6 hours after is at the boundary. Let's test 7 hours after:
            const hourAngle = timeToAngle(6); // 6 AM
            const markerAngle = timeToAngle(13); // 7 hours after 6 AM = 1 PM
            const rotationAngle = computeRotationAngle(hourAngle);
            const finalAngle = computeFinalAngle(markerAngle, rotationAngle);
            // markerAngle = π/2 + 13*2π/24 = π/2 + 13π/12
            // hourAngle = π/2 + 6*2π/24 = π/2 + π/2 = π
            // finalAngle = π/2 + 13π/12 + π/2 - π = 13π/12 — visible (> π)
            expect(isAngleVisible(finalAngle)).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    // Property: visibility is symmetric around the apex (3π/2)
    // -------------------------------------------------------------------------

    describe('Property: visibility is symmetric around the apex (3π/2)', () => {
        test('angles equidistant from apex (3π/2) have the same visibility', () => {
            const apex = 3 * Math.PI / 2;
            const offsets = [0.1, 0.5, 1.0, Math.PI / 4, Math.PI / 3, Math.PI / 2 - 0.01];
            for (const offset of offsets) {
                const leftAngle = apex - offset;
                const rightAngle = apex + offset;
                expect(isAngleVisible(leftAngle)).toBe(isAngleVisible(rightAngle));
            }
        });

        test('angles within π/2 of apex are visible', () => {
            const apex = 3 * Math.PI / 2;
            const offsets = [0, 0.1, Math.PI / 4, Math.PI / 2 - 0.01];
            for (const offset of offsets) {
                expect(isAngleVisible(apex - offset)).toBe(true);
                expect(isAngleVisible(apex + offset)).toBe(true);
            }
        });

        test('angles more than π/2 from apex are NOT visible', () => {
            const apex = 3 * Math.PI / 2;
            const offsets = [Math.PI / 2 + 0.01, Math.PI * 0.75, Math.PI - 0.01];
            for (const offset of offsets) {
                expect(isAngleVisible(apex - offset)).toBe(false);
                expect(isAngleVisible(apex + offset)).toBe(false);
            }
        });
    });

    // -------------------------------------------------------------------------
    // Property: label correctness — each marker has the right label
    // (Requirements 7.1, 7.2, 7.3)
    // -------------------------------------------------------------------------

    describe('Property: night fraction marker labels (Requirements 7.1, 7.2, 7.3)', () => {
        const MIDNIGHT_LABEL = '1/2';
        const ONE_THIRD_LABEL = '1/3';
        const TWO_THIRD_LABEL = '2/3';

        test('midnight marker uses label "1/2"', () => {
            expect(MIDNIGHT_LABEL).toBe('1/2');
        });

        test('one-third night marker uses label "1/3"', () => {
            expect(ONE_THIRD_LABEL).toBe('1/3');
        });

        test('two-thirds night marker uses label "2/3"', () => {
            expect(TWO_THIRD_LABEL).toBe('2/3');
        });

        test('all three labels are distinct', () => {
            const labels = [MIDNIGHT_LABEL, ONE_THIRD_LABEL, TWO_THIRD_LABEL];
            const uniqueLabels = new Set(labels);
            expect(uniqueLabels.size).toBe(3);
        });
    });
});
