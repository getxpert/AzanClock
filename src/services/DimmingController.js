/**
 * DimmingController - Manages intelligent background dimming based on sunrise/sunset times
 * 
 * This module calculates the appropriate background opacity based on the current time
 * relative to sunrise and sunset. It provides smooth transitions during 30-minute periods
 * after sunset and before sunrise.
 */

/**
 * Calculate the dimming level (opacity) based on current time and sunrise/sunset times
 * 
 * @param {string} currentTime - Current time in "HH:MM" format (24-hour)
 * @param {string} sunriseTime - Sunrise time in "HH:MM" format (24-hour)
 * @param {string} sunsetTime - Sunset time in "HH:MM" format (24-hour)
 * @returns {number} Opacity value between 0 and 1 (0 = fully dimmed, 1 = full brightness)
 */
export const calculateDimmingLevel = (currentTime, sunriseTime, sunsetTime) => {
    const currentMinutes = timeToMinutes(currentTime);
    const sunriseMinutes = timeToMinutes(sunriseTime);
    const sunsetMinutes = timeToMinutes(sunsetTime);
    
    // Define transition periods (30 minutes)
    const TRANSITION_DURATION = 30; // minutes
    
    // Calculate transition boundaries
    const sunriseTransitionStart = sunriseMinutes - TRANSITION_DURATION;
    const sunriseTransitionEnd = sunriseMinutes;
    const sunsetTransitionStart = sunsetMinutes;
    const sunsetTransitionEnd = sunsetMinutes + TRANSITION_DURATION;
    
    // Check if we're in daytime (between sunrise and sunset)
    if (isTimeBetween(currentMinutes, sunriseMinutes, sunsetMinutes)) {
        // Full opacity during daytime
        return 1.0;
    }
    
    // Check if we're in the sunrise transition period (before sunrise)
    if (isTimeBetween(currentMinutes, sunriseTransitionStart, sunriseTransitionEnd)) {
        // Smooth transition from dim to bright
        const progress = (currentMinutes - sunriseTransitionStart) / TRANSITION_DURATION;
        // Use ease-in-out curve for smoother transition
        const easedProgress = easeInOutCubic(progress);
        return 0.3 + (0.7 * easedProgress); // Transition from 0.3 to 1.0
    }
    
    // Check if we're in the sunset transition period (after sunset)
    if (isTimeBetween(currentMinutes, sunsetTransitionStart, sunsetTransitionEnd)) {
        // Smooth transition from bright to dim
        const progress = (currentMinutes - sunsetTransitionStart) / TRANSITION_DURATION;
        // Use ease-in-out curve for smoother transition
        const easedProgress = easeInOutCubic(progress);
        return 1.0 - (0.7 * easedProgress); // Transition from 1.0 to 0.3
    }
    
    // Nighttime - reduced opacity
    return 0.3;
};

/**
 * Convert time string to total minutes since midnight
 * 
 * @param {string} time - Time in "HH:MM" format
 * @returns {number} Total minutes since midnight
 */
const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Check if a time is between two other times, handling midnight wraparound
 * 
 * @param {number} time - Time in minutes since midnight
 * @param {number} start - Start time in minutes since midnight
 * @param {number} end - End time in minutes since midnight
 * @returns {boolean} True if time is between start and end
 */
const isTimeBetween = (time, start, end) => {
    // Normalize negative values (for times before midnight)
    const normalizeTime = (t) => {
        while (t < 0) t += 1440; // 1440 = 24 * 60
        return t % 1440;
    };
    
    time = normalizeTime(time);
    start = normalizeTime(start);
    end = normalizeTime(end);
    
    if (start <= end) {
        // Normal case: start and end are in the same day
        return time >= start && time < end;
    } else {
        // Wraparound case: period crosses midnight
        return time >= start || time < end;
    }
};

/**
 * Ease-in-out cubic function for smooth transitions
 * 
 * @param {number} t - Progress value between 0 and 1
 * @returns {number} Eased value between 0 and 1
 */
const easeInOutCubic = (t) => {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/**
 * Get dimming configuration based on current time and prayer times
 * 
 * @param {string} currentTime - Current time in "HH:MM" format (24-hour)
 * @param {string} sunriseTime - Sunrise time in "HH:MM" format (24-hour)
 * @param {string} sunsetTime - Sunset time in "HH:MM" format (24-hour)
 * @returns {Object} Dimming configuration with opacity and shouldDim flag
 */
export const getDimmingConfig = (currentTime, sunriseTime, sunsetTime) => {
    const opacity = calculateDimmingLevel(currentTime, sunriseTime, sunsetTime);
    
    return {
        opacity: opacity,
        shouldDim: opacity < 1.0,
        isDaytime: opacity === 1.0,
        isTransitioning: opacity > 0.3 && opacity < 1.0
    };
};

export default {
    calculateDimmingLevel,
    getDimmingConfig
};
