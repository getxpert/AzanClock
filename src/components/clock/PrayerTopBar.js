import React from 'react'

const calibri = "'Calibri', 'Calibri Light', 'Candara', 'Segoe UI', sans-serif"

const arabicPrayerNames = {
    Imsak: 'الإمساك',
    Fajr: 'الفجر',
    Sunrise: 'الضحى',
    Duha: 'الضحى',
    Dhuhr: 'الظهر',
    Asr: 'العصر',
    Maghrib: 'المغرب',
    Isha: 'العشاء',
}

export default function PrayerTopBar({ vakits, currentVakit, nextVakit, time, TOP_BAR, SIDE_TOTAL_L, SIDE_TOTAL_R, isPortableLandscape, isPortrait, dim }) {
    const rtlVakits = vakits ? [...vakits].reverse() : []
    const prayerFont = isPortableLandscape
        ? `clamp(8.4px, 2.8vw, 4.2vh)`
        : isPortrait
        ? `clamp(13px, 3.6vw, 20px)`
        : `clamp(8.4px, 2.45vw, 3.5vh)`

    // Convert "H:MM" or "HH:MM" to total minutes since midnight
    const toMins = (t) => {
        if (!t) return 0
        const [h, m] = t.split(':').map(Number)
        return h * 60 + m
    }

    // Minutes from now until a future time (wraps midnight)
    const minsUntil = (targetTime) => {
        const nowMins = toMins(time)
        const tMins = toMins(targetTime)
        return tMins >= nowMins ? tMins - nowMins : 1440 - nowMins + tMins
    }

    // Prayer bar: colour based on minutes remaining until this prayer's end
    const prayerHlBg = (vakit) => {
        if (!currentVakit || vakit.name !== currentVakit.name || vakit.time !== currentVakit.time)
            return 'transparent'
        const mins = minsUntil(nextVakit.time)
        if (mins > 60) return 'rgba(34, 197, 94, 0.85)'   // green
        if (mins > 15) return 'rgba(255, 200, 0, 0.85)'   // amber
        return 'rgba(239, 68, 68, 0.85)'                   // red
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: isPortableLandscape ? 0 : SIDE_TOTAL_L, right: isPortableLandscape ? 0 : SIDE_TOTAL_R, height: TOP_BAR,
            background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'stretch',
            overflow: 'hidden', zIndex: 100, fontFamily: calibri,
            opacity: dim === 1 ? 0.25 : 1,
        }}>
            {rtlVakits.map((v, i) => {
                const isCurrent = currentVakit && v.name === currentVakit.name && v.time === currentVakit.time
                return (
                    <div key={i} style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: isPortrait ? 'column' : 'row',
                        alignItems: 'center', justifyContent: 'center',
                        padding: isPortrait ? '3px 4px' : '0 8px',
                        fontWeight: isCurrent ? 'bold' : 'normal',
                        color: isCurrent ? 'white' : 'rgba(255,255,255,1)',
                        background: prayerHlBg(v),
                        borderRadius: 6,
                        overflow: 'hidden',
                        gap: isPortrait ? 1 : 10,
                    }}>
                        {/* Arabic name — top line in portrait */}
                        <span style={{
                            fontSize: prayerFont,
                            direction: 'rtl',
                            whiteSpace: 'nowrap',
                            color: 'white',
                            lineHeight: 1.1,
                        }}>
                            {arabicPrayerNames[v.name] || v.name}
                        </span>
                        {/* Time — bottom line in portrait */}
                        <span style={{
                            display: 'inline-flex', alignItems: 'baseline',
                            gap: 2, direction: 'ltr', whiteSpace: 'nowrap',
                        }}>
                            <span style={{
                                fontSize: prayerFont,
                                fontFamily: calibri,
                                letterSpacing: '0.04em',
                                color: isCurrent ? 'white' : '#FFC800',
                                lineHeight: 1.1,
                            }}>
                                {v.displayTime}
                            </span>
                            {!isPortrait && (
                                <span style={{
                                    fontSize: `clamp(4.9px, 1.4vw, 2.45vh)`,
                                    fontFamily: calibri,
                                    letterSpacing: 0,
                                    opacity: 0.85,
                                    color: isCurrent ? 'white' : '#FFC800',
                                }}>
                                    {parseInt(v.time.split(':')[0], 10) < 12 ? 'AM' : 'PM'}
                                </span>
                            )}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}
