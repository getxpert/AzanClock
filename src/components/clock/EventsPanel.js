import React from 'react'
import { EventsService } from '../../services/EventsService'

const calibri = "'Calibri', 'Calibri Light', 'Candara', 'Segoe UI', sans-serif"

export default function EventsPanel({ eventsData, eventsCount = 5, profile, PROFILE, TOP_BAR, BOTTOM_BAR, SIDE_TOTAL_L, dim, DATE_OVERLAY_H }) {
    const { active, upcoming } = eventsData
    if (active.length === 0 && upcoming.length === 0) return null

    // Apply the user-configured limit across active + upcoming combined
    const totalLimit = eventsCount
    const activeSlice = active.slice(0, totalLimit)
    const upcomingSlice = upcoming.slice(0, Math.max(0, totalLimit - activeSlice.length))

    const isPortLand = profile === 'portable-landscape'
    const isPortrait = profile === 'portable-portrait'

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
                : isPortrait
                ? {
                    bottom: DATE_OVERLAY_H ? `calc(${DATE_OVERLAY_H} + 8px)` : 80,
                    left: 4,
                    right: 4,
                    maxHeight: `calc(100vh - ${TOP_BAR + 80}px - ${DATE_OVERLAY_H ? `(${DATE_OVERLAY_H} + 8px)` : '80px'} - min(91vw, 91vh) - 10px)`,
                }
                : { bottom: BOTTOM_BAR + 100, left: SIDE_TOTAL_L + 16 }
            ),
            zIndex: 96,
            display: 'flex',
            flexDirection: isPortrait ? 'row' : 'column',
            flexWrap: isPortrait ? 'wrap' : 'nowrap',
            alignItems: isPortrait ? 'flex-start' : 'flex-start',
            gap: isPortrait ? 6 : 8,
            pointerEvents: 'none',
            fontFamily: calibri,
            maxWidth: isPortLand
                ? 'calc((100vw - 91vh) / 2 - 12px)'
                : isPortrait
                ? '100%'
                : PROFILE.eventsMaxW,
            ...(isPortLand ? { overflowY: 'auto', overflowX: 'hidden' } : {}),
            ...(isPortrait ? { overflowY: 'auto', overflowX: 'hidden', width: '100%' } : {}),
            opacity: dim === 1 ? 0.25 : 1,
        }}>
            {/* Active events */}
            {activeSlice.map((ev, i) => (
                <div key={`active-${i}`} style={{
                    position: 'relative',
                    background: `${ev.colour_code || '#ffffff'}28`,
                    border: `1px solid ${ev.colour_code || '#ffffff'}88`,
                    borderLeft: `5px solid ${ev.colour_code || '#4ade80'}`,
                    borderRadius: isPortrait ? 6 : 11,
                    padding: isPortrait ? '8px 8px 4px 8px' : '14px 16px 8px 16px',
                    marginTop: isPortrait ? 5 : 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isPortrait ? 1 : 3,
                    backdropFilter: 'blur(4px)',
                    width: '100%',
                    ...(isPortrait ? { flex: '1 1 calc(33.333% - 6px)', minWidth: 'min(calc(33.333% - 6px), 160px)', boxSizing: 'border-box' } : {}),
                }}>
                    {/* NOW badge */}
                    <span style={{
                        position: 'absolute',
                        left: isPortrait ? 6 : 10,
                        top: 0,
                        transform: 'translateY(-50%)',
                        background: 'rgba(74,222,128,0.85)',
                        color: '#000',
                        fontSize: isPortrait ? 'clamp(14px, 3.6vw, 18px)' : 'clamp(10px, 1.1vw, 13px)',
                        fontWeight: 'bold',
                        padding: isPortrait ? '1px 4px' : '2px 7px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                    }}>NOW</span>
                    {/* Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: isPortrait ? 4 : 9 }}>
                        <span style={{
                            color: 'rgba(255,255,255,0.9)',
                            fontSize: isPortrait ? 'clamp(17px, 4.6vw, 22px)' : 'clamp(16px, 1.9vw, 23px)',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textShadow: '0 2px 6px rgba(0,0,0,0.9), 0 4px 16px rgba(0,0,0,0.75), 2px 2px 0 rgba(0,0,0,0.8)',
                        }}>{ev.title}</span>
                    </div>
                    {/* Description */}
                    {ev.description && (
                        <div style={{ display: 'flex', gap: isPortrait ? 5 : 11, alignItems: 'center' }}>
                            <span style={{
                                color: 'rgba(255,255,255,0.82)',
                                fontSize: isPortrait ? 'clamp(14px, 4.0vw, 20px)' : 'clamp(13px, 1.5vw, 18px)',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                            }}>{ev.description}</span>
                        </div>
                    )}
                    {/* Time remaining + assigned to */}
                    <div style={{ display: 'flex', gap: isPortrait ? 5 : 11, alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                            color: ev.minutesRemaining <= 10
                                ? '#ef4444'
                                : ev.minutesRemaining <= 30
                                    ? '#fbbf24'
                                    : '#4ade80',
                            fontSize: isPortrait ? 'clamp(14px, 4.0vw, 20px)' : 'clamp(13px, 1.5vw, 18px)',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                        }}>⏱ {EventsService.formatMinutes(ev.minutesRemaining)} left</span>
                        {ev.assigned_to && (
                            <span style={{
                                color: '#fbbf24',
                                fontSize: isPortrait ? 'clamp(13px, 3.6vw, 18px)' : 'clamp(12px, 1.35vw, 16px)',
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
                        borderRadius: isPortrait ? 6 : 11,
                        padding: isPortrait ? '8px 8px 4px 8px' : '14px 16px 8px 16px',
                        marginTop: isPortrait ? 5 : 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: isPortrait ? 1 : 3,
                        backdropFilter: 'blur(4px)',
                        width: '100%',
                        opacity: 0.88,
                        ...(isPortrait ? { flex: '1 1 calc(33.333% - 6px)', minWidth: 'min(calc(33.333% - 6px), 160px)', boxSizing: 'border-box' } : {}),
                    }}>
                        {/* Badge */}
                        <span style={{
                            position: 'absolute',
                            left: isPortrait ? 6 : 10,
                            top: 0,
                            transform: 'translateY(-50%)',
                            background: badgeBg,
                            color: '#000',
                            fontSize: isPortrait ? 'clamp(14px, 3.6vw, 18px)' : 'clamp(10px, 1.1vw, 13px)',
                            fontWeight: 'bold',
                            padding: isPortrait ? '1px 4px' : '2px 7px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                        }}>{whenBadge}</span>
                        {/* Title */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: isPortrait ? 4 : 9 }}>
                            <span style={{
                                color: 'rgba(255,255,255,0.9)',
                                fontSize: isPortrait ? 'clamp(17px, 4.6vw, 22px)' : 'clamp(16px, 1.9vw, 23px)',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>{ev.title}</span>
                        </div>
                        {/* Scheduled time */}
                        <div style={{ display: 'flex', gap: isPortrait ? 5 : 11, alignItems: 'center' }}>
                            <span style={{
                                color: 'white',
                                fontSize: isPortrait ? 'clamp(14px, 4.0vw, 20px)' : 'clamp(13px, 1.5vw, 18px)',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                            }}>📅 {occLabel}</span>
                        </div>
                        {/* Remaining + assigned to */}
                        <div style={{ display: 'flex', gap: isPortrait ? 5 : 11, alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{
                                color: '#fbbf24',
                                fontSize: isPortrait ? 'clamp(14px, 4.0vw, 20px)' : 'clamp(13px, 1.5vw, 18px)',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                            }}>⏳ {EventsService.formatMinutes(ev.minutesRemaining)}</span>
                            {ev.assigned_to && (
                                <span style={{
                                    color: '#fbbf24',
                                    fontSize: isPortrait ? 'clamp(13px, 3.6vw, 18px)' : 'clamp(12px, 1.35vw, 16px)',
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
