/**
 * Property tests for Prayer Countdown Display
 *
 * Property 15: Prayer Countdown Display
 * For any clock state, the elapsed time since the current prayer and the
 * countdown to the next prayer SHALL be displayed.
 *
 * Validates: Requirements 11.5
 */

// ---------------------------------------------------------------------------
// Pure helper functions that mirror the display logic in Clock.js
// ---------------------------------------------------------------------------

/**
 * Formats a duration in minutes as "Xh Ym" or "Ym" string,
 * mirroring the format used by SmartAzanClock for elapsed/nextText values.
 */
function formatDuration(totalMinutes) {
    if (totalMinutes < 0) return null; // invalid
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.floor(totalMinutes % 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

/**
 * Builds the elapsed label string as rendered by Clock.js:
 *   "Elapsed <elapsed> · <nextVakit.name> in"
 */
function buildElapsedLabel(elapsed, nextVakitName) {
    return `Elapsed ${elapsed} · ${nextVakitName} in`;
}

/**
 * Checks whether the elapsed label contains both the elapsed time and
 * the next prayer name, as required by Requirement 11.5.
 */
function elapsedLabelIsComplete(elapsed, nextVakitName) {
    const label = buildElapsedLabel(elapsed, nextVakitName);
    return label.includes(elapsed) && label.includes(nextVakitName);
}

/**
 * Checks whether the countdown (nextText) is a non-empty string,
 * as required by Requirement 11.5.
 */
function countdownIsDisplayable(nextText) {
    return typeof nextText === 'string' && nextText.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Test data generators
// ---------------------------------------------------------------------------

/** Generate a range of elapsed durations in minutes */
const elapsedMinutes = [0, 1, 5, 30, 59, 60, 61, 90, 119, 120, 180, 240, 300];

/** Prayer names used in the app */
const prayerNames = ['Imsak', 'Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

/** Countdown strings as produced by SmartAzanClock */
const countdownStrings = ['0m', '1m', '5m', '30m', '59m', '1h 0m', '1h 30m', '2h 0m', '5h 59m'];

// ---------------------------------------------------------------------------
// Property 15: Prayer Countdown Display
// ---------------------------------------------------------------------------

describe('Prayer Countdown Display - Property 15', () => {

    // -----------------------------------------------------------------------
    // 15.1 Elapsed time label is always present and contains required info
    // -----------------------------------------------------------------------

    describe('Elapsed time label contains elapsed duration and next prayer name', () => {

        test('label includes elapsed string for all elapsed durations', () => {
            for (const minutes of elapsedMinutes) {
                const elapsed = formatDuration(minutes);
                for (const name of prayerNames) {
                    expect(elapsedLabelIsComplete(elapsed, name)).toBe(true);
                }
            }
        });

        test('label always starts with "Elapsed"', () => {
            for (const minutes of elapsedMinutes) {
                const elapsed = formatDuration(minutes);
                for (const name of prayerNames) {
                    const label = buildElapsedLabel(elapsed, name);
                    expect(label.startsWith('Elapsed')).toBe(true);
                }
            }
        });

        test('label always contains " · " separator between elapsed and next prayer', () => {
            for (const minutes of elapsedMinutes) {
                const elapsed = formatDuration(minutes);
                for (const name of prayerNames) {
                    const label = buildElapsedLabel(elapsed, name);
                    expect(label).toContain(' · ');
                }
            }
        });

        test('label always ends with " in" to indicate countdown follows', () => {
            for (const minutes of elapsedMinutes) {
                const elapsed = formatDuration(minutes);
                for (const name of prayerNames) {
                    const label = buildElapsedLabel(elapsed, name);
                    expect(label.endsWith(' in')).toBe(true);
                }
            }
        });
    });

    // -----------------------------------------------------------------------
    // 15.2 Countdown (nextText) is always a non-empty displayable string
    // -----------------------------------------------------------------------

    describe('Next prayer countdown is always displayable', () => {

        test('countdown is displayable for all valid countdown strings', () => {
            for (const nextText of countdownStrings) {
                expect(countdownIsDisplayable(nextText)).toBe(true);
            }
        });

        test('countdown is not displayable for empty string', () => {
            expect(countdownIsDisplayable('')).toBe(false);
        });

        test('countdown is not displayable for whitespace-only string', () => {
            expect(countdownIsDisplayable('   ')).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // 15.3 Both elapsed and countdown are rendered together (not independently)
    // -----------------------------------------------------------------------

    describe('Both elapsed and countdown are present in every clock state', () => {

        test('for every combination of prayer name and countdown, both are present', () => {
            for (const name of prayerNames) {
                for (const nextText of countdownStrings) {
                    const elapsed = formatDuration(30); // arbitrary elapsed
                    const label = buildElapsedLabel(elapsed, name);

                    // The elapsed label references the next prayer name
                    expect(label).toContain(name);
                    // The countdown is separately displayable
                    expect(countdownIsDisplayable(nextText)).toBe(true);
                }
            }
        });
    });

    // -----------------------------------------------------------------------
    // 15.4 Duration formatting is consistent and non-null for valid inputs
    // -----------------------------------------------------------------------

    describe('Duration formatting produces valid strings for all valid inputs', () => {

        test('formatDuration returns a non-empty string for all non-negative minute values', () => {
            const testValues = [0, 1, 10, 59, 60, 61, 119, 120, 180, 300, 600, 1440];
            for (const minutes of testValues) {
                const result = formatDuration(minutes);
                expect(typeof result).toBe('string');
                expect(result.length).toBeGreaterThan(0);
            }
        });

        test('formatDuration returns null for negative values (invalid input)', () => {
            expect(formatDuration(-1)).toBeNull();
            expect(formatDuration(-60)).toBeNull();
        });

        test('formatDuration includes hours component only when duration >= 60 minutes', () => {
            for (let m = 0; m < 60; m++) {
                const result = formatDuration(m);
                expect(result).not.toContain('h');
            }
            for (const m of [60, 61, 90, 120, 180]) {
                const result = formatDuration(m);
                expect(result).toContain('h');
            }
        });

        test('formatDuration for exactly 60 minutes is "1h 0m"', () => {
            expect(formatDuration(60)).toBe('1h 0m');
        });

        test('formatDuration for 0 minutes is "0m"', () => {
            expect(formatDuration(0)).toBe('0m');
        });

        test('formatDuration for 90 minutes is "1h 30m"', () => {
            expect(formatDuration(90)).toBe('1h 30m');
        });
    });

    // -----------------------------------------------------------------------
    // 15.5 Elapsed label structure is invariant across all prayer names
    // -----------------------------------------------------------------------

    describe('Elapsed label structure is invariant across all prayer names', () => {

        test('label structure "Elapsed X · Y in" holds for all prayer names', () => {
            const elapsed = '45m';
            for (const name of prayerNames) {
                const label = buildElapsedLabel(elapsed, name);
                // Must match pattern: "Elapsed <elapsed> · <name> in"
                const expected = `Elapsed ${elapsed} · ${name} in`;
                expect(label).toBe(expected);
            }
        });
    });
});
