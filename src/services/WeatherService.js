/**
 * Weather Service Module
 * 
 * Fetches weather data (temperature, conditions) from external API
 * Updates hourly and persists last successful data on failures
 */

class WeatherService {
    constructor() {
        this.lastSuccessfulData = null;
        this.updateIntervalId = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the weather service with location coordinates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {function} onUpdate - Callback function to handle weather updates
     */
    initialize(lat, lng, onUpdate) {
        this.lat = lat;
        this.lng = lng;
        this.onUpdate = onUpdate;
        this.isInitialized = true;

        // Fetch immediately on initialization
        this.fetchWeatherData();

        // Set up hourly updates (3600000 ms = 1 hour)
        this.updateIntervalId = setInterval(() => {
            this.fetchWeatherData();
        }, 3600000);
    }

    /**
     * Calculate moon phase based on current date
     * Returns moon phase name and illumination percentage
     * Algorithm based on astronomical calculations
     */
    calculateMoonPhase() {
        const now = new Date();
        
        // Known new moon reference: January 6, 2000, 18:14 UTC
        const knownNewMoon = new Date('2000-01-06T18:14:00Z');
        
        // Lunar cycle length in days (synodic month)
        const lunarCycle = 29.53058867;
        
        // Calculate days since known new moon
        const daysSinceNewMoon = (now - knownNewMoon) / (1000 * 60 * 60 * 24);
        
        // Calculate current position in lunar cycle (0-1)
        const cyclePosition = (daysSinceNewMoon % lunarCycle) / lunarCycle;
        
        // Calculate illumination percentage
        const illumination = Math.round((1 - Math.cos(cyclePosition * 2 * Math.PI)) * 50);
        
        // Determine moon phase name based on cycle position
        let phaseName;
        let phaseEmoji;
        
        if (cyclePosition < 0.033 || cyclePosition >= 0.967) {
            phaseName = 'New Moon';
            phaseEmoji = '🌑';
        } else if (cyclePosition < 0.217) {
            phaseName = 'Waxing Crescent';
            phaseEmoji = '🌒';
        } else if (cyclePosition < 0.283) {
            phaseName = 'First Quarter';
            phaseEmoji = '🌓';
        } else if (cyclePosition < 0.467) {
            phaseName = 'Waxing Gibbous';
            phaseEmoji = '🌔';
        } else if (cyclePosition < 0.533) {
            phaseName = 'Full Moon';
            phaseEmoji = '🌕';
        } else if (cyclePosition < 0.717) {
            phaseName = 'Waning Gibbous';
            phaseEmoji = '🌖';
        } else if (cyclePosition < 0.783) {
            phaseName = 'Last Quarter';
            phaseEmoji = '🌗';
        } else {
            phaseName = 'Waning Crescent';
            phaseEmoji = '🌘';
        }
        
        return {
            name: phaseName,
            emoji: phaseEmoji,
            illumination: illumination,
            cyclePosition: cyclePosition
        };
    }

    /**
     * Fetch weather data from external API
     * Uses Open-Meteo API (free, no API key required)
     */
    async fetchWeatherData() {
        if (!this.isInitialized || !this.lat || !this.lng) {
            console.warn('WeatherService: Not initialized or missing coordinates');
            return;
        }

        try {
            // Using Open-Meteo API - free weather API, no key required
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.lat}&longitude=${this.lng}&current=temperature_2m,weather_code&temperature_unit=celsius&timezone=auto`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Weather API returned status ${response.status}`);
            }

            const data = await response.json();

            // Calculate moon phase
            const moonPhase = this.calculateMoonPhase();

            // Extract weather data
            const weatherData = {
                temperature: Math.round(data.current.temperature_2m),
                temperatureUnit: '°C',
                weatherCode: data.current.weather_code,
                description: this.getWeatherDescription(data.current.weather_code),
                moonPhase: moonPhase,
                timestamp: new Date().toISOString(),
                success: true
            };

            // Store as last successful data
            this.lastSuccessfulData = weatherData;

            // Persist to localStorage for recovery after page reload
            localStorage.setItem('lastWeatherData', JSON.stringify(weatherData));

            // Notify callback
            if (this.onUpdate) {
                this.onUpdate(weatherData);
            }

            console.log('WeatherService: Successfully fetched weather data', weatherData);

        } catch (error) {
            console.error('WeatherService: Failed to fetch weather data', error);

            // On failure, use last successful data if available
            if (this.lastSuccessfulData) {
                console.log('WeatherService: Using last successful data');
                if (this.onUpdate) {
                    this.onUpdate({
                        ...this.lastSuccessfulData,
                        success: false,
                        error: error.message
                    });
                }
            } else {
                // Try to recover from localStorage
                const stored = localStorage.getItem('lastWeatherData');
                if (stored) {
                    try {
                        const recoveredData = JSON.parse(stored);
                        this.lastSuccessfulData = recoveredData;
                        console.log('WeatherService: Recovered data from localStorage');
                        if (this.onUpdate) {
                            this.onUpdate({
                                ...recoveredData,
                                success: false,
                                error: error.message
                            });
                        }
                    } catch (parseError) {
                        console.error('WeatherService: Failed to parse stored weather data', parseError);
                    }
                }
            }
        }
    }

    /**
     * Convert WMO weather code to human-readable description
     * @param {number} code - WMO weather code
     * @returns {string} Weather description
     */
    getWeatherDescription(code) {
        // WMO Weather interpretation codes
        const weatherCodes = {
            0: 'Clear',
            1: 'Mainly Clear',
            2: 'Partly Cloudy',
            3: 'Overcast',
            45: 'Foggy',
            48: 'Foggy',
            51: 'Light Drizzle',
            53: 'Drizzle',
            55: 'Heavy Drizzle',
            56: 'Freezing Drizzle',
            57: 'Freezing Drizzle',
            61: 'Light Rain',
            63: 'Rain',
            65: 'Heavy Rain',
            66: 'Freezing Rain',
            67: 'Freezing Rain',
            71: 'Light Snow',
            73: 'Snow',
            75: 'Heavy Snow',
            77: 'Snow Grains',
            80: 'Light Showers',
            81: 'Showers',
            82: 'Heavy Showers',
            85: 'Light Snow Showers',
            86: 'Snow Showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with Hail',
            99: 'Thunderstorm with Hail'
        };

        return weatherCodes[code] || 'Unknown';
    }

    /**
     * Get the last successful weather data
     * @returns {object|null} Last weather data or null
     */
    getLastData() {
        return this.lastSuccessfulData;
    }

    /**
     * Stop the weather service and clear interval
     */
    stop() {
        if (this.updateIntervalId) {
            clearInterval(this.updateIntervalId);
            this.updateIntervalId = null;
        }
        this.isInitialized = false;
    }

    /**
     * Update location and restart fetching
     * @param {number} lat - New latitude
     * @param {number} lng - New longitude
     */
    updateLocation(lat, lng) {
        this.stop();
        this.initialize(lat, lng, this.onUpdate);
    }
}

// Export singleton instance
export const weatherService = new WeatherService();
