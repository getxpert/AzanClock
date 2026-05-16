import React from 'react'
import { EventsService } from '../../services/EventsService'

const calibri = "'Calibri', 'Calibri Light', 'Candara', 'Segoe UI', sans-serif"

export default function EventsPanel({ eventsData, eventsCount = 5, profile, PROFILE, TOP_BAR, BOTTOM_BAR, SIDE_TOTAL_L, dim }) {
    const { active, upcoming } = eventsData
    if (active.length === 0 && upcoming.length === 0) return null

    // Apply the user-configured limit across active + upcoming combined
    const totalLimit = eventsCount
    const activeSlice = active.slice(0, totalLimit)
    const upcomingSlice = upcoming.slice(0, Math.max(0, totalLimit - activeSlice.length))

    const isPortLand = profile === 'portable-landscape'

    return (
        <div style={{
            position: 'fixed',
            ...(isPortLand
                ? {
                    top: TOP_BAR + 10,
                    left: 4,
                    bottom: BOTTOM_BAR + 10,
                    maxWidth: 'calc((100vw - 91vh) / 2 - 12px)',
                }
                : { bottom: BOTTOM_BAR + 100, left: SIDE_TOTAL_L + 16 }
            ),
            zIndex: 96,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 8,
            pointerEvents: 'none',
            fontFamily: calibri,
            maxWidth: isPortLand
                ? 'calc((100vw - 91vh) / 2 - 12px)'
                : PROFILE.eventsMaxW,
            ...(isPortLand ? { overflowY: 'auto', overflowX: 'hidden' } : {}),
            opacity: dim === 1 ? 0.25 : 1,
        }}>
            {/* Active events */}
            {activeSlice.map((ev, i) => (
                <div key={`active-${i}`} style={{
                    position: 'relative',
                    background: `${ev.colour_code || '#ffffff'}28`,
                    border: `1px solid ${ev.colour_code || '#ffffff'}88`,
                    borderLeft: `5px solid ${ev.colour_code || '#4ade80'}`,
                    borderRadius: 11,
                    padding: '14px 16px 8px 16px',
                    marginTop: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    backdropFilter: 'blur(4px)',
                    width: '100%',
                }}>
                    {/* NOW badge */}
                    <span style={{
                        position: 'absolute',
                        left: 10,
                        top: 0,
                        transform: 'translateY(-50%)',
                        background: 'rgba(74,222,128,0.85)',
                        color: '#000',
                        fontSize: 'clamp(10px, 1.1vw, 13px)',
                        fontWeight: 'bold',
                        padding: '2px 7px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                    }}>NOW</span>
                    {/* Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{
                            color: 'rgba(255,255,255,0.9)',
                            fontSize: 'clamp(16px, 1.9vw, 23px)',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textShadow: '0 2px 6px rgba(0,0,0,0.9), 0 4px 16px rgba(0,0,0,0.75), 2px 2px 0 rgba(0,0,0,0.8)',
                        }}>{ev.title}</span>
                    </div>
                    {/* Description */}
                    {ev.description && (
                        <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                            <span style={{
                                color: 'rgba(255,255,255,0.82)',
                                fontSize: 'clamp(13px, 1.5vw, 18px)',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                            }}>{ev.description}</span>
                        </div>
                    )}
                    {/* Time remaining + assigned to */}
                    <div style={{ display: 'flex', gap: 11, alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                            color: ev.minutesRemaining <= 10
                                ? '#ef4444'
                                : ev.minutesRemaining <= 30
                                    ? '#fbbf24'
                                    : '#4ade80',
                            fontSize: 'clamp(13px, 1.5vw, 18px)',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                        }}>⏱ {EventsService.formatMinutes(ev.minutesRemaining)} left</span>
                        {ev.assigned_to && (
                            <span style={{
                                color: '#fbbf24',
                                fontSize: 'clamp(12px, 1.35vw, 16px)',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                textAlign: 'right',
                            }}>👤 {ev.assigned_to}</span>
                        )}
                    </div>
                </div>
            ))}

            {/* Upcoming events */}
            {upcomingSlice.map((ev, i) => {
                const occDate = ev.nextOccurrence
                const occHH = String(occDate.getHours()).padStart(2, '0')
                const occMM = String(occDate.getMinutes()).padStart(2, '0')
                const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                const occWhen = `${occHH}:${occMM} ${DAY_NAMES[occDate.getDay()]}, ${MONTH_NAMES[occDate.getMonth()]} ${occDate.getDate()}`
                
                const diffMins = Math.ceil((occDate - new Date()) / 60000)
                const occLabel = diffMins > 24 * 60
                    ? (() => {
                        const days = Math.floor(diffMins / (24 * 60))
                        const hours = Math.floor((diffMins % (24 * 60)) / 60)
                        return `${occWhen} · ${hours > 0 ? `${days}d ${hours}h` : `${days}d`}`
                    })()
                    : occWhen
                
                const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
                const occMidnight = new Date(occDate); occMidnight.setHours(0, 0, 0, 0)
                const calDays = Math.round((occMidnight - todayMidnight) / 86400000)
                const whenBadge = calDays === 0 ? 'Today'
                    : calDays === 1 ? 'Tomorrow'
                        : `In ${calDays} days`
                const badgeBg = calDays === 0 ? 'rgba(74,222,128,0.85)'
                    : calDays === 1 ? 'rgba(251,191,36,0.85)'
                        : 'rgba(96,165,250,0.85)'
                
                return (
                    <div key={`upcoming-${i}`} style={{
                        position: 'relative',
                        background: 'rgba(0,0,0,0.55)',
                        border: `1px solid ${ev.colour_code || '#ffffff'}44`,
                        borderLeft: `5px solid ${ev.colour_code || '#fbbf24'}`,
                        borderRadius: 11,
                        padding: '14px 16px 8px 16px',
                        marginTop: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        backdropFilter: 'blur(4px)',
                        width: '100%',
                        opacity: 0.88,
                    }}>
                        {/* Badge */}
                        <span style={{
                            position: 'absolute',
                            left: 10,
                            top: 0,
                            transform: 'translateY(-50%)',
                            background: badgeBg,
                            color: '#000',
                            fontSize: 'clamp(10px, 1.1vw, 13px)',
                            fontWeight: 'bold',
                            padding: '2px 7px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                        }}>{whenBadge}</span>
                        {/* Title */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <span style={{
                                color: 'rgba(255,255,255,0.9)',
                                fontSize: 'clamp(16px, 1.9vw, 23px)',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>{ev.title}</span>
                        </div>
                        {/* Scheduled time */}
                        <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                            <span style={{
                                color: 'white',
                                fontSize: 'clamp(13px, 1.5vw, 18px)',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                            }}>📅 {occLabel}</span>
                        </div>
                        {/* Remaining + assigned to */}
                        <div style={{ display: 'flex', gap: 11, alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{
                                color: '#fbbf24',
                                fontSize: 'clamp(13px, 1.5vw, 18px)',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                            }}>⏳ {EventsService.formatMinutes(ev.minutesRemaining)}</span>
                            {ev.assigned_to && (
                                <span style={{
                                    color: '#fbbf24',
                                    fontSize: 'clamp(12px, 1.35vw, 16px)',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    textAlign: 'right',
                                }}>👤 {ev.assigned_to}</span>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
