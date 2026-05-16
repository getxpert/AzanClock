import React from 'react'
import tempColourConfig from '../../data/temperatureColours.json'

const calibri = "'Calibri', 'Calibri Light', 'Candara', 'Segoe UI', sans-serif"

// Temperature colour resolver
const getTempColours = (temp) => {
    let config = tempColourConfig;
    try {
        const stored = localStorage.getItem('temperatureColours');
        if (stored) config = JSON.parse(stored);
    } catch (e) { /* ignore */ }
    const bands = (config.bands || []).slice().sort((a, b) => b.min - a.min);
    for (const band of bands) {
        if (temp >= band.min) {
            return { unit: band.unit, number: band.number };
        }
    }
    return (config.default) || { unit: 'white', number: 'white' };
};

export default function WeatherDisplay({ weatherData, currentVakit, currentHijriDay, locationSettings, profile, PROFILE, TOP_BAR, SIDE_TOTAL_L }) {
    const afterSunset = currentVakit &&
        (currentVakit.name === 'Maghrib' || currentVakit.name === 'Isha' || currentVakit.name === 'Imsak')

    const weatherIcon = weatherData ? (() => {
        const code = weatherData.weatherCode;
        if (code === 0) return '☀️';
        if (code === 1) return '🌤️';
        if (code === 2) return '⛅';
        if (code === 3) return '☁️';
        if (code === 45 || code === 48) return '🌫️';
        if (code >= 51 && code <= 57) return '🌦️';
        if (code >= 61 && code <= 67) return '🌧️';
        if (code >= 71 && code <= 77) return '❄️';
        if (code >= 80 && code <= 82) return '🌧️';
        if (code >= 85 && code <= 86) return '🌨️';
        if (code >= 95 && code >= 99) return '⛈️';
        return '🌡️';
    })() : null;

    // In landscape/desktop/portable-landscape: weather is drawn on canvas
    if (profile === 'landscape' || profile === 'desktop' || profile === 'portable-landscape')
        return null;

    // Show component if: moon phase after sunset OR weather data available OR location available
    const hasLocation = locationSettings?.address
    const showMoon = afterSunset
    const showWeather = weatherData && weatherIcon
    
    if (!showMoon && !showWeather && !hasLocation) return null

    const tempColours = weatherData?.temperature !== undefined ? getTempColours(weatherData.temperature) : null;
    const toTitleCase = (str) => str
        ? str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        : null;
    const locationAddress = toTitleCase(locationSettings?.address) || null;
    const locationCountry = toTitleCase(weatherData?.country) || null;

    return (
        <div style={{
            position: 'fixed',
            top: TOP_BAR,
            left: SIDE_TOTAL_L,
            zIndex: 99,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            padding: '14px 18px',
            pointerEvents: 'none',
            lineHeight: 1.1,
        }}>
            {/* Icon + temperature on one row */}
            {(showMoon || showWeather) && (
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.4em' }}>
                    {afterSunset ? (
                        <img
                            src={`/moon/${currentHijriDay}.png`}
                            alt={`Moon day ${currentHijriDay}`}
                            style={{
                                width: PROFILE.weatherIconSize,
                                height: PROFILE.weatherIconSize,
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.95)) drop-shadow(0 4px 12px rgba(0,0,0,0.85)) drop-shadow(0 0 20px rgba(0,0,0,0.7))',
                            }}
                        />
                    ) : weatherIcon && (
                        <span style={{
                            fontSize: PROFILE.weatherIconSize,
                            lineHeight: 1,
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.95)) drop-shadow(0 4px 12px rgba(0,0,0,0.85)) drop-shadow(0 0 20px rgba(0,0,0,0.7))',
                        }}>{weatherIcon}</span>
                    )}
                    {weatherData?.temperature !== undefined && tempColours && (
                        <span style={{
                            fontFamily: "'Orbitron', 'Courier New', monospace",
                            fontSize: PROFILE.weatherTempSize,
                            fontWeight: 'bold',
                            textShadow: '0 2px 4px rgba(0,0,0,1), 0 4px 12px rgba(0,0,0,0.95), 0 8px 24px rgba(0,0,0,0.85), 2px 2px 0 rgba(0,0,0,0.9), -2px -2px 0 rgba(0,0,0,0.9)',
                            letterSpacing: '0.04em',
                            lineHeight: 1,
                        }}>
                            <span style={{ color: tempColours.number }}>{weatherData.temperature}</span>
                            <span style={{ color: tempColours.unit }}>°C</span>
                        </span>
                    )}
                </div>
            )}
            {/* Divider line - only show if we have icon/temp AND location */}
            {(showMoon || showWeather) && locationAddress && (
                <div style={{
                    width: '100%',
                    height: 2,
                    background: 'rgba(255,255,255,0.35)',
                    borderRadius: 1,
                    margin: '10px 0 8px 0',
                }} />
            )}
            {/* Location */}
            {locationAddress && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}>
                    <span style={{
                        fontFamily: calibri,
                        fontSize: PROFILE.weatherLocSize,
                        fontWeight: 'bold',
                        color: 'white',
                        textShadow: '0 2px 4px rgba(0,0,0,1), 0 4px 12px rgba(0,0,0,0.95), 0 8px 24px rgba(0,0,0,0.85), 2px 2px 0 rgba(0,0,0,0.9), -2px -2px 0 rgba(0,0,0,0.9)',
                        letterSpacing: '0.03em',
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 'calc(100vw - 220px)',
                    }}>{locationAddress}</span>
                    {/* country name hidden */}
                </div>
            )}
        </div>
    );
}
