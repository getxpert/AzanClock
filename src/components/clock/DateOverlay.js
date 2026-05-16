import React from 'react'
import { HijriMonths } from '../../data/Common'

const calibri = "'Calibri', 'Calibri Light', 'Candara', 'Segoe UI', sans-serif"

export default function DateOverlay({ 
    todaysDate, 
    hijriDate, 
    locationSettings, 
    currentVakit,
    profile, 
    BOTTOM_BAR, 
    SIDE_TOTAL_L, 
    SIDE_TOTAL_R,
    isPortrait,
    isPortableLandscape,
    dim
}) {
    const now = new Date()
    const tzID = locationSettings?.timeZoneID || 'UTC'
    const localNow = new Date(now.toLocaleString('en-US', { timeZone: tzID }))
    const currentGregorianDay = localNow.getDate()
    const currentGregorianMonth = localNow.getMonth()
    const currentGregorianYear = localNow.getFullYear()

    // Derive current Hijri day/month from hijriDate string
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

    // After Maghrib the Islamic day has already advanced (night belongs to the next day)
    // Night period: Maghrib → Isha → Imsak (ends at Fajr)
    const isNightPeriod = currentVakit &&
        (currentVakit.name === 'Maghrib' || currentVakit.name === 'Isha' || currentVakit.name === 'Imsak')
    const islamicDayOfWeek = isNightPeriod
        ? (localNow.getDay() + 1) % 7
        : localNow.getDay()
    const currentDayOfWeek = islamicDayOfWeek

    const enDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const enMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const dayName = enDayNames[localNow.getDay()]
    const monthName = enMonthNames[currentGregorianMonth]
    const isWeekend = localNow.getDay() === 0 || localNow.getDay() === 6
    const accentColor = isWeekend ? '#4ade80' : '#fbbf24'
    const textShadow = '0 2px 4px rgba(0,0,0,1), 0 4px 12px rgba(0,0,0,0.95), 0 8px 24px rgba(0,0,0,0.85), 2px 2px 0 rgba(0,0,0,0.9), -2px -2px 0 rgba(0,0,0,0.9)'

    // Arabic days
    const arDays = [
        { label: 'الأحد', jsDay: 0 },
        { label: 'الاثنين', jsDay: 1 },
        { label: 'الثلاثاء', jsDay: 2 },
        { label: 'الأربعاء', jsDay: 3 },
        { label: 'الخميس', jsDay: 4 },
        { label: 'الجمعة', jsDay: 5 },
        { label: 'السبت', jsDay: 6 },
    ]

    const arabicHijriMonths = [
        'مُحَرَّم', 'صَفَر', 'رَبيع الأوَّل', 'رَبيع الثاني',
        'جُمادى الأولى', 'جُمادى الآخِرة', 'رَجَب', 'شَعبان',
        'رَمَضان', 'شَوَّال', 'ذو القَعدة', 'ذو الحِجَّة'
    ]

    const arabicDayBaseName = arDays.find(d => d.jsDay === currentDayOfWeek)?.label ?? ''
    // During the night (Maghrib → Fajr), prefix with ليلة to indicate "the night of"
    const arabicDayName = isNightPeriod ? `ليلة ${arabicDayBaseName}` : arabicDayBaseName
    const arabicMonthName = arabicHijriMonths[(currentHijriMonth - 1)] ?? ''
    
    // Convert digits to Eastern Arabic numerals
    const toArabicNumerals = (n) =>
        String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])
    const arabicDay = toArabicNumerals(currentHijriDay)
    const arabicYear = toArabicNumerals(currentHijriYear)
    const isFriday = currentDayOfWeek === 5
    const isRamadan = currentHijriMonth === 9

    return (
        <>
            {/* Gregorian date overlay — bottom-left */}
            <div style={{
                position: 'fixed',
                bottom: BOTTOM_BAR + 4,
                left: isPortrait ? '50%' : (isPortableLandscape ? 4 : SIDE_TOTAL_L + 16),
                transform: isPortrait ? 'translateX(-50%)' : undefined,
                zIndex: 98,
                display: 'flex',
                flexDirection: isPortableLandscape ? 'column' : 'row',
                alignItems: isPortableLandscape ? 'flex-start' : 'baseline',
                gap: isPortableLandscape ? 2 : 10,
                direction: 'ltr',
                pointerEvents: 'none',
                fontFamily: calibri,
                textShadow,
                whiteSpace: 'nowrap',
                opacity: dim === 1 ? 0.25 : 1,
            }}>
                {/* Day name */}
                <span style={{
                    fontSize: 'clamp(22px, 3.4vw, 56px)',
                    fontWeight: 'normal',
                    lineHeight: 1.15,
                    color: accentColor,
                }}>{dayName}</span>
                {/* Date line: Month Day, Year */}
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                    <span style={{
                        fontSize: 'clamp(28px, 4.2vw, 68px)',
                        fontWeight: 'bold',
                        lineHeight: 1.15,
                        color: 'rgba(255,255,255,0.92)',
                    }}>{monthName}</span>
                    <span style={{
                        fontSize: 'clamp(28px, 4.2vw, 68px)',
                        fontWeight: 'bold',
                        lineHeight: 1.15,
                        color: accentColor,
                    }}>{currentGregorianDay},</span>
                    <span style={{
                        fontSize: 'clamp(22px, 3.4vw, 56px)',
                        fontWeight: 'normal',
                        lineHeight: 1.15,
                        color: 'rgba(255,255,255,0.85)',
                    }}>{currentGregorianYear}</span>
                </div>
            </div>

            {/* Islamic date overlay — bottom-right (hidden in portrait) */}
            {!isPortrait && (
                <>
                    <div style={{
                        position: 'fixed',
                        bottom: BOTTOM_BAR + 4,
                        right: isPortableLandscape ? 10 : SIDE_TOTAL_R + 16,
                        zIndex: 98,
                        display: 'flex',
                        flexDirection: isPortableLandscape ? 'column' : 'row',
                        alignItems: isPortableLandscape ? 'flex-end' : 'baseline',
                        gap: isPortableLandscape ? 2 : 12,
                        direction: 'rtl',
                        pointerEvents: 'none',
                        fontFamily: calibri,
                        textShadow,
                        whiteSpace: 'nowrap',
                        opacity: dim === 1 ? 0.25 : 1,
                    }}>
                        {/* Day name — inline for non-portable-landscape */}
                        {!isPortableLandscape && (
                            <span style={{
                                fontSize: 'clamp(28px, 4.2vw, 68px)',
                                fontWeight: 'bold',
                                lineHeight: 1.15,
                                color: isFriday ? '#4ade80' : '#fbbf24',
                                alignSelf: 'flex-end',
                                textAlign: 'right',
                            }}>{arabicDayName}</span>
                        )}
                        {/* Date line */}
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 12, direction: 'rtl', justifyContent: 'flex-end' }}>
                            <span style={{
                                fontSize: 'clamp(28px, 4.2vw, 68px)',
                                fontWeight: 'bold',
                                lineHeight: 1.15,
                                color: 'rgba(255,255,255,0.92)',
                            }}>{arabicDay}</span>
                            <span style={{
                                fontSize: 'clamp(28px, 4.2vw, 68px)',
                                fontWeight: 'bold',
                                lineHeight: 1.15,
                                color: isRamadan ? '#4ade80' : '#fbbf24',
                            }}>{arabicMonthName}</span>
                            <span style={{
                                fontSize: 'clamp(22px, 3.4vw, 56px)',
                                fontWeight: 'normal',
                                lineHeight: 1.15,
                                color: 'rgba(255,255,255,0.85)',
                            }}>{arabicYear} هـ</span>
                        </div>
                    </div>
                    {/* Day name for portable-landscape — pinned to right screen edge */}
                    {isPortableLandscape && (
                        <span style={{
                            position: 'fixed',
                            bottom: `calc(${BOTTOM_BAR + 4}px + clamp(32px, 4.83vw, 78px) + 4px)`,
                            right: 10,
                            zIndex: 98,
                            fontSize: 'clamp(28px, 4.2vw, 68px)',
                            fontWeight: 'bold',
                            color: isFriday ? '#4ade80' : '#fbbf24',
                            textAlign: 'right',
                            direction: 'rtl',
                            pointerEvents: 'none',
                            fontFamily: calibri,
                            textShadow,
                            whiteSpace: 'nowrap',
                            opacity: dim === 1 ? 0.25 : 1,
                        }}>{arabicDayName}</span>
                    )}
                </>
            )}
        </>
    )
}
