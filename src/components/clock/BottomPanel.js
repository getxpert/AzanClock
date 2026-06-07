import React from 'react'

const calibri = "'Calibri', 'Calibri Light', 'Candara', 'Segoe UI', sans-serif"
const hlColor = '#000'
const dimColor = 'rgba(255,255,255,1)'

export default function BottomPanel({ locationSettings, currentVakit, BOTTOM_BAR, SIDE_TOTAL_L, SIDE_TOTAL_R, dim }) {
    const now = new Date()
    const tzID = locationSettings?.timeZoneID || 'UTC'
    const localNow = new Date(now.toLocaleString('en-US', { timeZone: tzID }))

    // After Maghrib the Islamic day has already advanced (night belongs to the next day)
    // Night period: Maghrib → Isha → Imsak (ends at Fajr)
    const isNightPeriod = currentVakit &&
        (currentVakit.name === 'Maghrib' || currentVakit.name === 'Isha' || currentVakit.name === 'Imsak')
    const islamicDayOfWeek = isNightPeriod
        ? (localNow.getDay() + 1) % 7
        : localNow.getDay()
    const currentDayOfWeek = islamicDayOfWeek

    // English days: Mon–Sun
    const enDays = [
        { label: 'Mon', jsDay: 1, weekend: false },
        { label: 'Tue', jsDay: 2, weekend: false },
        { label: 'Wed', jsDay: 3, weekend: false },
        { label: 'Thu', jsDay: 4, weekend: false },
        { label: 'Fri', jsDay: 5, weekend: false },
        { label: 'Sat', jsDay: 6, weekend: true },
        { label: 'Sun', jsDay: 0, weekend: true },
    ]

    // Arabic days: Sun–Sat (Islamic week order)
    const arDays = [
        { label: 'الأحد', jsDay: 0 },
        { label: 'الاثنين', jsDay: 1 },
        { label: 'الثلاثاء', jsDay: 2 },
        { label: 'الأربعاء', jsDay: 3 },
        { label: 'الخميس', jsDay: 4 },
        { label: 'الجمعة', jsDay: 5 },
        { label: 'السبت', jsDay: 6 },
    ]

    return (
        <div style={{
            position: 'fixed', bottom: 0, left: SIDE_TOTAL_L, right: SIDE_TOTAL_R, height: BOTTOM_BAR,
            background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'stretch',
            overflow: 'hidden', zIndex: 100,
            opacity: dim === 1 ? 0.25 : 1,
        }}>
            {/* Left half — English Mon–Sun */}
            <div style={{
                flex: 1, display: 'flex', alignItems: 'stretch',
                borderRight: '1px solid rgba(255,255,255,0.15)',
                fontFamily: calibri,
            }}>
                {enDays.map(({ label, jsDay, weekend }) => {
                    const isToday = jsDay === localNow.getDay()
                    const bg = isToday
                        ? (weekend
                            ? 'rgba(34, 197, 94, 0.85)'
                            : 'rgba(255, 200, 0, 0.85)')
                        : 'transparent'
                    return (
                        <div key={label} style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: isToday ? 'bold' : 'normal',
                            color: isToday ? hlColor : dimColor,
                            background: bg,
                            borderRadius: 3,
                            whiteSpace: 'nowrap',
                        }}>{label}</div>
                    )
                })}
            </div>

            {/* Right half — Arabic days (Sun–Sat, Islamic order) */}
            <div style={{
                flex: 1, display: 'flex', alignItems: 'stretch',
                fontFamily: calibri,
                direction: 'rtl',
            }}>
                {arDays.map(({ label, jsDay }) => {
                    const isToday = jsDay === currentDayOfWeek
                    const isFriday = jsDay === 5
                    const bg = isToday
                        ? (isFriday
                            ? 'rgba(34, 197, 94, 0.85)'
                            : 'rgba(255, 200, 0, 0.85)')
                        : 'transparent'
                    // During the night period, prefix the current day with ليلة
                    const displayLabel = (isToday && isNightPeriod) ? `ليلة ${label}` : label
                    return (
                        <div key={label} style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: isToday && isNightPeriod ? 11 : 16,
                            fontWeight: isToday ? 'bold' : 'normal',
                            color: isToday ? hlColor : dimColor,
                            background: bg,
                            borderRadius: 3,
                            whiteSpace: 'nowrap',
                        }}>{displayLabel}</div>
                    )
                })}
            </div>
        </div>
    )
}
