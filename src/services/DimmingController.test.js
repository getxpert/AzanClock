import { calculateDimmingLevel, getDimmingConfig } from './DimmingController';

describe('DimmingController', () => {
    describe('calculateDimmingLevel', () => {
        test('should return full opacity (1.0) during daytime', () => {
            // Sunrise at 6:00, Sunset at 18:00, Current time at 12:00 (noon)
            const opacity = calculateDimmingLevel('12:00', '6:00', '18:00');
            expect(opacity).toBe(1.0);
        });

        test('should return reduced opacity (0.3) during nighttime', () => {
            // Sunrise at 6:00, Sunset at 18:00, Current time at 23:00 (11 PM)
            const opacity = calculateDimmingLevel('23:00', '6:00', '18:00');
            expect(opacity).toBe(0.3);
        });

        test('should return reduced opacity (0.3) during early morning nighttime', () => {
            // Sunrise at 6:00, Sunset at 18:00, Current time at 3:00 (3 AM)
            const opacity = calculateDimmingLevel('3:00', '6:00', '18:00');
            expect(opacity).toBe(0.3);
        });

        test('should transition from dim to bright before sunrise', () => {
            // Sunrise at 6:00, Current time at 5:45 (15 minutes before sunrise)
            const opacity = calculateDimmingLevel('5:45', '6:00', '18:00');
            // Should be in transition (between 0.3 and 1.0)
            expect(opacity).toBeGreaterThan(0.3);
            expect(opacity).toBeLessThan(1.0);
        });

        test('should transition from bright to dim after sunset', () => {
            // Sunset at 18:00, Current time at 18:15 (15 minutes after sunset)
            const opacity = calculateDimmingLevel('18:15', '6:00', '18:00');
            // Should be in transition (between 0.3 and 1.0)
            expect(opacity).toBeGreaterThan(0.3);
            expect(opacity).toBeLessThan(1.0);
        });

        test('should handle sunrise transition start correctly', () => {
            // Sunrise at 6:00, Current time at 5:30 (30 minutes before sunrise - start of transition)
            const opacity = calculateDimmingLevel('5:30', '6:00', '18:00');
            // Should be at the start of transition (close to 0.3)
            expect(opacity).toBeCloseTo(0.3, 1);
        });

        test('should handle sunset transition end correctly', () => {
            // Sunset at 18:00, Current time at 18:30 (30 minutes after sunset - end of transition)
            const opacity = calculateDimmingLevel('18:30', '6:00', '18:00');
            // Should be at the end of transition (close to 0.3)
            expect(opacity).toBeCloseTo(0.3, 1);
        });

        test('should handle midnight wraparound correctly', () => {
            // Sunrise at 6:00, Sunset at 18:00, Current time at 0:00 (midnight)
            const opacity = calculateDimmingLevel('0:00', '6:00', '18:00');
            expect(opacity).toBe(0.3);
        });

        test('should handle early sunrise times', () => {
            // Sunrise at 5:00, Sunset at 19:00, Current time at 10:00
            const opacity = calculateDimmingLevel('10:00', '5:00', '19:00');
            expect(opacity).toBe(1.0);
        });

        test('should handle late sunset times', () => {
            // Sunrise at 7:00, Sunset at 20:00, Current time at 21:00
            const opacity = calculateDimmingLevel('21:00', '7:00', '20:00');
            expect(opacity).toBe(0.3);
        });
    });

    describe('getDimmingConfig', () => {
        test('should return correct config for daytime', () => {
            const config = getDimmingConfig('12:00', '6:00', '18:00');
            expect(config.opacity).toBe(1.0);
            expect(config.shouldDim).toBe(false);
            expect(config.isDaytime).toBe(true);
            expect(config.isTransitioning).toBe(false);
        });

        test('should return correct config for nighttime', () => {
            const config = getDimmingConfig('23:00', '6:00', '18:00');
            expect(config.opacity).toBe(0.3);
            expect(config.shouldDim).toBe(true);
            expect(config.isDaytime).toBe(false);
            expect(config.isTransitioning).toBe(false);
        });

        test('should return correct config for transition period', () => {
            const config = getDimmingConfig('5:45', '6:00', '18:00');
            expect(config.opacity).toBeGreaterThan(0.3);
            expect(config.opacity).toBeLessThan(1.0);
            expect(config.shouldDim).toBe(true);
            expect(config.isDaytime).toBe(false);
            expect(config.isTransitioning).toBe(true);
        });
    });

    describe('edge cases', () => {
        test('should handle same sunrise and sunset times', () => {
            // Edge case: sunrise and sunset at same time (shouldn't happen in reality)
            const opacity = calculateDimmingLevel('12:00', '12:00', '12:00');
            // When sunrise equals sunset and current time equals both, it's considered daytime
            expect(opacity).toBe(1.0);
        });

        test('should handle times with leading zeros', () => {
            const opacity = calculateDimmingLevel('09:05', '06:30', '18:45');
            expect(opacity).toBe(1.0);
        });

        test('should handle transition at exact sunrise time', () => {
            const opacity = calculateDimmingLevel('6:00', '6:00', '18:00');
            // At exact sunrise, should be at full opacity (daytime starts)
            expect(opacity).toBe(1.0);
        });

        test('should handle transition at exact sunset time', () => {
            const opacity = calculateDimmingLevel('18:00', '6:00', '18:00');
            // At exact sunset, the time is still considered daytime (boundary condition)
            // The transition starts immediately after sunset
            expect(opacity).toBe(1.0);
        });
    });
});
