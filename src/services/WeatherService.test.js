/**
 * Tests for WeatherService
 */

import { weatherService } from './WeatherService';

// Mock fetch globally
global.fetch = jest.fn();

describe('WeatherService', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        
        // Clear localStorage
        localStorage.clear();
        
        // Stop any running service
        weatherService.stop();
    });

    afterEach(() => {
        // Clean up after each test
        weatherService.stop();
    });

    describe('Weather Description Mapping', () => {
        test('should map weather codes to correct descriptions', () => {
            expect(weatherService.getWeatherDescription(0)).toBe('Clear');
            expect(weatherService.getWeatherDescription(1)).toBe('Mainly Clear');
            expect(weatherService.getWeatherDescription(2)).toBe('Partly Cloudy');
            expect(weatherService.getWeatherDescription(61)).toBe('Light Rain');
            expect(weatherService.getWeatherDescription(95)).toBe('Thunderstorm');
            expect(weatherService.getWeatherDescription(999)).toBe('Unknown');
        });
    });

    describe('Moon Phase Calculation', () => {
        test('should calculate moon phase with valid properties', () => {
            const moonPhase = weatherService.calculateMoonPhase();
            
            expect(moonPhase).toBeTruthy();
            expect(moonPhase.name).toBeTruthy();
            expect(moonPhase.emoji).toBeTruthy();
            expect(typeof moonPhase.illumination).toBe('number');
            expect(moonPhase.illumination).toBeGreaterThanOrEqual(0);
            expect(moonPhase.illumination).toBeLessThanOrEqual(100);
            expect(typeof moonPhase.cyclePosition).toBe('number');
            expect(moonPhase.cyclePosition).toBeGreaterThanOrEqual(0);
            expect(moonPhase.cyclePosition).toBeLessThan(1);
        });

        test('should return one of the eight moon phases', () => {
            const moonPhase = weatherService.calculateMoonPhase();
            const validPhases = [
                'New Moon',
                'Waxing Crescent',
                'First Quarter',
                'Waxing Gibbous',
                'Full Moon',
                'Waning Gibbous',
                'Last Quarter',
                'Waning Crescent'
            ];
            
            expect(validPhases).toContain(moonPhase.name);
        });

        test('should return appropriate emoji for moon phase', () => {
            const moonPhase = weatherService.calculateMoonPhase();
            const validEmojis = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
            
            expect(validEmojis).toContain(moonPhase.emoji);
        });
    });

    describe('Initialization', () => {
        test('should initialize with coordinates and callback', () => {
            const mockCallback = jest.fn();
            const lat = 40.7128;
            const lng = -74.0060;

            weatherService.initialize(lat, lng, mockCallback);

            expect(weatherService.lat).toBe(lat);
            expect(weatherService.lng).toBe(lng);
            expect(weatherService.onUpdate).toBe(mockCallback);
            expect(weatherService.isInitialized).toBe(true);
        });

        test('should not fetch if not initialized', async () => {
            await weatherService.fetchWeatherData();
            expect(fetch).not.toHaveBeenCalled();
        });
    });

    describe('Weather Data Fetching', () => {
        test('should fetch weather data successfully', async () => {
            const mockWeatherData = {
                current: {
                    temperature_2m: 72.5,
                    weather_code: 1
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockWeatherData
            });

            const mockCallback = jest.fn();
            weatherService.initialize(40.7128, -74.0060, mockCallback);

            // Wait for the fetch to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('api.open-meteo.com')
            );
            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    temperature: 73,
                    temperatureUnit: '°F',
                    description: 'Mainly Clear',
                    moonPhase: expect.objectContaining({
                        name: expect.any(String),
                        emoji: expect.any(String),
                        illumination: expect.any(Number),
                        cyclePosition: expect.any(Number)
                    }),
                    success: true
                })
            );
        });

        test('should handle API failure gracefully with last successful data', async () => {
            const mockWeatherData = {
                current: {
                    temperature_2m: 72.5,
                    weather_code: 1
                }
            };

            // First successful fetch
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockWeatherData
            });

            const mockCallback = jest.fn();
            weatherService.initialize(40.7128, -74.0060, mockCallback);

            // Wait for first fetch
            await new Promise(resolve => setTimeout(resolve, 100));

            // Clear the callback mock
            mockCallback.mockClear();

            // Second fetch fails
            fetch.mockRejectedValueOnce(new Error('Network error'));

            await weatherService.fetchWeatherData();

            // Should call callback with last successful data
            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    temperature: 73,
                    success: false,
                    error: 'Network error'
                })
            );
        });

        test('should persist weather data to localStorage', async () => {
            const mockWeatherData = {
                current: {
                    temperature_2m: 72.5,
                    weather_code: 1
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockWeatherData
            });

            const mockCallback = jest.fn();
            weatherService.initialize(40.7128, -74.0060, mockCallback);

            // Wait for fetch
            await new Promise(resolve => setTimeout(resolve, 100));

            const stored = localStorage.getItem('lastWeatherData');
            expect(stored).toBeTruthy();
            
            const parsedData = JSON.parse(stored);
            expect(parsedData.temperature).toBe(73);
            expect(parsedData.description).toBe('Mainly Clear');
        });

        test('should recover from localStorage on failure with no last data', async () => {
            // Clear the service's last successful data
            weatherService.lastSuccessfulData = null;
            
            // Pre-populate localStorage
            const storedData = {
                temperature: 65,
                temperatureUnit: '°F',
                description: 'Clear',
                timestamp: new Date().toISOString(),
                success: true
            };
            localStorage.setItem('lastWeatherData', JSON.stringify(storedData));

            // Mock fetch to fail
            fetch.mockRejectedValueOnce(new Error('Network error'));

            const mockCallback = jest.fn();
            weatherService.initialize(40.7128, -74.0060, mockCallback);

            // Wait for fetch attempt
            await new Promise(resolve => setTimeout(resolve, 100));

            // Should recover from localStorage
            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    temperature: 65,
                    description: 'Clear',
                    success: false
                })
            );
        });
    });

    describe('Location Updates', () => {
        test('should update location and restart fetching', async () => {
            const mockCallback = jest.fn();
            
            // Initial setup
            weatherService.initialize(40.7128, -74.0060, mockCallback);
            
            // Update location
            weatherService.updateLocation(34.0522, -118.2437);

            expect(weatherService.lat).toBe(34.0522);
            expect(weatherService.lng).toBe(-118.2437);
            expect(weatherService.isInitialized).toBe(true);
        });
    });

    describe('Service Lifecycle', () => {
        test('should stop service and clear interval', () => {
            const mockCallback = jest.fn();
            weatherService.initialize(40.7128, -74.0060, mockCallback);

            expect(weatherService.isInitialized).toBe(true);
            expect(weatherService.updateIntervalId).toBeTruthy();

            weatherService.stop();

            expect(weatherService.isInitialized).toBe(false);
            expect(weatherService.updateIntervalId).toBeNull();
        });

        test('should get last data', async () => {
            const mockWeatherData = {
                current: {
                    temperature_2m: 72.5,
                    weather_code: 1
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockWeatherData
            });

            const mockCallback = jest.fn();
            weatherService.initialize(40.7128, -74.0060, mockCallback);

            // Wait for fetch
            await new Promise(resolve => setTimeout(resolve, 100));

            const lastData = weatherService.getLastData();
            expect(lastData).toBeTruthy();
            expect(lastData.temperature).toBe(73);
        });
    });
});
