import React from 'react'
import { HijriMonths } from '../../data/Common'

const calibri = "'Calibri', 'Calibri Light', 'Candara', 'Segoe UI', sans-serif"
const hlColor = '#000'
const dimColor = 'rgba(255,255,255,1)'

export default function SidePanels({ 
    todaysDate, 
    hijriDate, 
    locationSettings,
    currentVakit,
    PROFILE, 
    TOP_BAR, 
    BOTTOM_BAR, 
    SIDE_INNER, 
    SIDE_OUTER_L, 
    SIDE_OUTER_R,
    SIDE_TOTAL_L,
    SIDE_TOTAL_R 
}) {
    const now = new Date()
    const tzID = locationSettings?.timeZoneID || 'UTC'
    const localNow = new Date(now.toLocaleString('en-US', { timeZone: tzID }))
    const currentGregorianDay = localNow.getDate()
    const currentGregorianMonth = localNow.getMonth()
    const currentGregorianYear = localNow.getFullYear()
    const currentHour = localNow.getHours()
    const daysInMonth = new Date(currentGregorianYear, currentGregorianMonth + 1, 0).getDate()

    // Derive current Hijri day/month
    let currentHijriDay = 1, currentHijriMonth = 1, currentHijriYear = 1446
    try {
        const hParts = hijriDate ? hijriDate.split(' ') : []
        if (hParts.length >= 3) {
            currentHijriDay = parseInt(hParts[0], 10)
            currentHijriYear = parseInt(hParts[hParts.length - 1], 10)
            const monthName = hParts.slice(1, hParts.length - 1).join(' ')
            currentHijriMonth = HijriMonths.indexOf(monthName) + 1
        }
    } catch (e) { /* ignore */ }

    // Days in current Hijri month
    let daysInHijriMonth = 30
    try {
        const hijriMonthStart = new Date(now.toLocaleString('en-US', { timeZone: tzID }))
        hijriMonthStart.setDate(hijriMonthStart.getDate() - currentHijriDay + 1)
        let count = 0
        for (let d = 1; d <= 30; d++) {
            const probe = new Date(hijriMonthStart)
            probe.setDate(hijriMonthStart.getDate() + d - 1)
            const hm = parseInt(probe.toLocaleDateString('en-SA-u-ca-islamic-umalqura', { timeZone: tzID, month: 'numeric' }), 10)
            if (hm === currentHijriMonth) count = d
            else if (count > 0) break
        }
        if (count > 0) daysInHijriMonth = count
    } catch (e) { /* ignore */ }

    // Highlight helpers
    const hijriDayHlBg = (day) => {
        if (day !== currentHijriDay) return 'transparent'
        const name = currentVakit?.name
        if (name === 'Asr') return 'rgba(239, 68, 68, 0.85)'
        if (name === 'Dhuhr') return 'rgba(255, 200, 0, 0.85)'
        return 'rgba(34, 197, 94, 0.85)'
    }

    const dayHlBg = (day) => {
        if (day !== currentGregorianDay) return 'transparent'
        const h = localNow.getHours()
        if (h < 12) return 'rgba(34, 197, 94, 0.85)'
        if (h < 18) return 'rgba(255, 200, 0, 0.85)'
        return 'rgba(239, 68, 68, 0.85)'
    }

    const sideCellHeight = `calc((100vh - ${TOP_BAR + BOTTOM_BAR}px) / 31)`
    const sideFontSize = `calc((100vh - ${TOP_BAR + BOTTOM_BAR}px) / 31 * 0.58)`

    if (!PROFILE.showSidePanels) return null

    return (
        <>
            {/* Top-left corner: app icon */}
            <div style={{
                position: 'fixed', top: 0, left: 0,
                width: SIDE_TOTAL_L, height: TOP_BAR,
                background: 'black',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 101, overflow: 'hidden',
            }}>
                <img
                    src="/icon4.png"
                    alt="AzanClock"
                    style={{
                        maxWidth: '90%',
                        maxHeight: '90%',
                        objectFit: 'contain',
                    }}
                />
            </div>

            {/* Top-right corner: نور الصلاة */}
            <div style={{
                position: 'fixed', top: 0, right: 0,
                width: SIDE_TOTAL_R, height: TOP_BAR,
                background: 'black',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 101, overflow: 'hidden',
            }}>
                <span style={{
                    fontFamily: calibri,
                    fontSize: `clamp(12px, ${TOP_BAR * 0.46}px, 2vw)`,
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    direction: 'rtl',
                    color: '#4ade80',
                }}>نور الصلاة</span>
            </div>

            {/* Bottom-left corner: Gregorian year */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0,
                width: SIDE_TOTAL_L, height: BOTTOM_BAR,
                background: 'black', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 101, overflow: 'hidden',
            }}>
                <span style={{
                    fontFamily: calibri,
                    fontSize: 18,
                    fontWeight: 'bold',
                    letterSpacing: 2,
                    whiteSpace: 'nowrap',
                }}>{currentGregorianYear}</span>
            </div>

            {/* Bottom-right corner: Hijri year */}
            <div style={{
                position: 'fixed', bottom: 0, right: 0,
                width: SIDE_TOTAL_R, height: BOTTOM_BAR,
                background: 'black', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 101, overflow: 'hidden',
            }}>
                <span style={{
                    fontFamily: calibri,
                    fontSize: 18,
                    fontWeight: 'bold',
                    letterSpacing: 2,
                    whiteSpace: 'nowrap',
                }}>{currentHijriYear}</span>
            </div>

            {/* Outer left bar: Gregorian months */}
            <div style={{
                position: 'fixed', top: TOP_BAR, left: 0, bottom: BOTTOM_BAR,
                width: SIDE_OUTER_L,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'stretch', overflow: 'hidden', zIndex: 100,
                fontFamily: calibri,
            }}>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((name, i) => {
                    const isCurrent = i === currentGregorianMonth
                    const d = currentGregorianDay
                    const bg = !isCurrent ? 'transparent'
                        : d <= 10 ? 'rgba(34, 197, 94, 0.85)'
                            : d <= 20 ? 'rgba(255, 200, 0, 0.85)'
                                : 'rgba(239, 68, 68, 0.85)'
                    return (
                        <div key={i} style={{
                            flex: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: `calc((100vh - ${TOP_BAR + BOTTOM_BAR}px) / 12 * 0.42)`,
                            fontWeight: isCurrent ? 'bold' : 'normal',
                            color: isCurrent ? hlColor : dimColor,
                            background: bg,
                            borderRadius: 3,
                        }}>{name}</div>
                    )
                })}
            </div>

            {/* Outer right bar: Islamic months in Arabic */}
            <div style={{
                position: 'fixed', top: TOP_BAR, right: 0, bottom: BOTTOM_BAR,
                width: SIDE_OUTER_R,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'stretch', overflow: 'hidden', zIndex: 100,
                fontFamily: calibri,
            }}>
                {[
                    'مُحَرَّم', 'صَفَر', 'رَبيع الأوَّل', 'رَبيع الثاني',
                    'جُمادى الأولى', 'جُمادى الآخِرة', 'رَجَب', 'شَعبان',
                    'رَمَضان', 'شَوَّال', 'ذو القَعدة', 'ذو الحِجَّة'
                ].map((name, i) => {
                    const isCurrent = i === (currentHijriMonth - 1)
                    const d = currentHijriDay
                    const bg = !isCurrent ? 'transparent'
                        : d <= 10 ? 'rgba(34, 197, 94, 0.85)'
                            : d <= 20 ? 'rgba(255, 200, 0, 0.85)'
                                : 'rgba(239, 68, 68, 0.85)'
                    return (
                        <div key={i} style={{
                            flex: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: `calc((100vh - ${TOP_BAR + BOTTOM_BAR}px) / 12 * 0.30)`,
                            fontWeight: isCurrent ? 'bold' : 'normal',
                            color: isCurrent ? hlColor : dimColor,
                            background: bg,
                            borderRadius: 3,
                            direction: 'rtl',
                            textAlign: 'center',
                            padding: '0 2px',
                            whiteSpace: 'nowrap',
                        }}>{name}</div>
                    )
                })}
            </div>

            {/* Left panel: Gregorian days of month */}
            <div style={{
                position: 'fixed', top: TOP_BAR, left: SIDE_OUTER_L, bottom: BOTTOM_BAR, width: SIDE_INNER,
                background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column',
                alignItems: 'stretch', overflow: 'hidden', zIndex: 100, fontFamily: calibri,
            }}>
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1
                    const isToday = day === currentGregorianDay
                    return (
                        <div key={day} style={{
                            height: sideCellHeight, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '100%',
                            fontSize: sideFontSize,
                            fontWeight: isToday ? 'bold' : 'normal',
                            color: isToday ? hlColor : dimColor,
                            background: dayHlBg(day),
                            borderRadius: 3,
                        }}>{day}</div>
                    )
                })}
            </div>

            {/* Right panel: Hijri days of month */}
            <div style={{
                position: 'fixed', top: TOP_BAR, right: SIDE_OUTER_R, bottom: BOTTOM_BAR, width: SIDE_INNER,
                background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column',
                alignItems: 'stretch', overflow: 'hidden', zIndex: 100, fontFamily: calibri,
            }}>
                {Array.from({ length: daysInHijriMonth }, (_, i) => {
                    const day = i + 1
                    const isToday = day === currentHijriDay
                    return (
                        <div key={day} style={{
                            height: sideCellHeight, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '100%',
                            fontSize: sideFontSize,
                            fontWeight: isToday ? 'bold' : 'normal',
                            color: isToday ? hlColor : dimColor,
                            background: hijriDayHlBg(day),
                            borderRadius: 3,
                        }}>{day}</div>
                    )
                })}
            </div>
        </>
    )
}
