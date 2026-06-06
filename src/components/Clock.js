import React, { useContext, useEffect, useRef, useState } from 'react'
import { AppContext } from '../AppContext'
import { EventsService } from '../services/EventsService'
import { Audios } from '../data/Audios'

// Import sub-components
import HadithDisplay from './clock/HadithDisplay'
import EventsPanel from './clock/EventsPanel'
import PrayerTopBar from './clock/PrayerTopBar'
import WeatherDisplay from './clock/WeatherDisplay'
import DateOverlay from './clock/DateOverlay'
import SidePanels from './clock/SidePanels'
import BottomPanel from './clock/BottomPanel'
import MainDial from './clock/MainDial'

// ── Hadith of the day ─────────────────────────────────────────────────────────
let _hadiths = null
const loadHadiths = async () => {
    if (_hadiths) return _hadiths
    try {
        const res = await fetch('/hadiths.csv')
        const text = await res.text()
        const rows = text.trim().split('\n').slice(1)
        _hadiths = rows.map(row => {
            const cols = row.split('\t')
            return { type: cols[0] || '', arabic: cols[1] || '', english: cols[2] || '', reference: cols[3] || '' }
        }).filter(h => h.arabic)
    } catch (e) {
        _hadiths = []
    }
    return _hadiths
}

export default function Clock() {
    const {
        showMenu, setShowMenu, nextText, todaysDate, hijriDate, locationSettings,
        calculationSettings, deviceSettings, hourAngle, vakits, arcVakits, displayTime, currentVakit, nextVakit, currentArcVakit,
        elapsed, background, dim, clockOpacity, midnightAngle, oneThirdAngle, twoThirdAngle, alarmSettings, naflAlarmSettings, isWeekDay, weatherData, time, isAudioPlaying,
        prayerTimes
    } = useContext(AppContext)

    const canvasRef = useRef(null)
    const driftRef = useRef(null)
    const dragWrapperRef = useRef(null)
    const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, hasMoved: false })

    // Pre-load hand PNGs
    const hourImgRef = useRef(null)
    const minuteImgRef = useRef(null)
    useEffect(() => {
        const h = new Image(); h.src = '/hourhand.png'; hourImgRef.current = h
        const m = new Image(); m.src = '/minutehand.png'; minuteImgRef.current = m
    }, [])

    const moonImgRef = useRef(null)

    // Tick every second
    const [tick, setTick] = useState(0)
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 1000)
        return () => clearInterval(id)
    }, [])

    // ── Hadith of the hour ────────────────────────────────────────────────────
    const [dailyHadith, setDailyHadith] = useState(null)
    const [hadithExpanded, setHadithExpanded] = useState(true)
    useEffect(() => {
        const pickRandom = (hadiths) => {
            if (!hadiths.length) return
            setDailyHadith(hadiths[Math.floor(Math.random() * hadiths.length)])
            setHadithExpanded(true)
        }
        loadHadiths().then(pickRandom)

        const scheduleNext = () => {
            const now = new Date()
            const msToNextHr = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000 - now.getMilliseconds()
            return setTimeout(() => {
                loadHadiths().then(pickRandom)
                const id = setInterval(() => loadHadiths().then(pickRandom), 3600000)
                return () => clearInterval(id)
            }, msToNextHr)
        }
        const timeoutId = scheduleNext()
        return () => clearTimeout(timeoutId)
    }, [])

    // ── Events ────────────────────────────────────────────────────────────────
    const [eventsData, setEventsData] = useState({ active: [], upcoming: [] })
    const notifiedRef = useRef(new Set())
    const notifAudioRef = useRef(null)
    // Keep refs so the stable interval always sees the latest values
    const isAudioPlayingRef = useRef(isAudioPlaying)
    const prayerTimesRef = useRef(prayerTimes)
    useEffect(() => { isAudioPlayingRef.current = isAudioPlaying }, [isAudioPlaying])
    useEffect(() => { prayerTimesRef.current = prayerTimes }, [prayerTimes])

    useEffect(() => {
        const notifSrc = Audios.find(a => a.id === 101)?.source

        // Load events immediately on mount
        EventsService.getActiveAndUpcoming(new Date(), 5, prayerTimesRef.current).then(setEventsData)

        const intervalId = setInterval(async () => {
            if (new Date().getSeconds() !== 0) return

            const now = new Date()
            const data = await EventsService.getActiveAndUpcoming(now, 5, prayerTimesRef.current)
            setEventsData(data)

            if (!isAudioPlayingRef.current && notifSrc) {
                const due = await EventsService.getNotificationsDue(now, prayerTimesRef.current)
                for (const ev of due) {
                    const key = `${ev.id}-${ev.nextOccurrence.toISOString()}`
                    if (notifiedRef.current.has(key)) continue

                    notifiedRef.current.add(key)

                    if (notifAudioRef.current) {
                        notifAudioRef.current.pause()
                        notifAudioRef.current.currentTime = 0
                    }
                    const audio = new Audio(notifSrc)
                    notifAudioRef.current = audio
                    audio.play().catch(() => { })
                    break
                }
            }
        }, 1000)
        return () => clearInterval(intervalId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // stable interval — refs keep values current without re-registering

    // ── Drag handlers ─────────────────────────────────────────────────────────
    const handlePointerDown = (e) => {
        const drag = dragRef.current
        drag.isDragging = true
        drag.startX = e.clientX - drag.offsetX
        drag.startY = e.clientY - drag.offsetY
        drag.hasMoved = false
        e.currentTarget.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e) => {
        const drag = dragRef.current
        if (!drag.isDragging) return
        const newX = e.clientX - drag.startX
        const newY = e.clientY - drag.startY
        if (Math.abs(newX - drag.offsetX) > 3 || Math.abs(newY - drag.offsetY) > 3)
            drag.hasMoved = true
        drag.offsetX = newX
        drag.offsetY = newY
        const el = dragWrapperRef.current
        if (el) el.style.transform = `translate(${newX}px, ${newY}px)`
    }

    const handlePointerUp = () => {
        const drag = dragRef.current
        drag.isDragging = false
        drag.offsetX = 0
        drag.offsetY = 0
        const el = dragWrapperRef.current
        if (el) el.style.transform = 'translate(0px, 0px)'
    }

    const handleClick = () => {
        if (!dragRef.current.hasMoved) {
            setShowMenu(!showMenu)
        }
    }

    const size = 1000

    // ── Background update ─────────────────────────────────────────────────────
    const updateBackground = (bg) => {
        if (bg.length > 0) {
            document.body.style.backgroundImage = 'url(' + bg + ')';
            document.body.style.backgroundSize = '110% 110%';
            document.body.style.backgroundRepeat = 'no-repeat';
        }
        else {
            document.body.style.backgroundImage = null;
            document.body.style.backgroundSize = null;
            document.body.style.backgroundRepeat = null;
            document.body.style.backgroundPosition = null;
        }
    }

    useEffect(() => {
        updateBackground(background);
    }, [background])

    // ── Derive current Hijri day for moon phase ──────────────────────────────
    const now = new Date()
    const tzID = locationSettings?.timeZoneID || 'UTC'
    const localNow = new Date(now.toLocaleString('en-US', { timeZone: tzID }))
    
    let currentHijriDay = 1
    try {
        const hParts = hijriDate ? hijriDate.split(' ') : []
        if (hParts.length >= 3) {
            currentHijriDay = parseInt(hParts[0], 10)
        }
    } catch (e) { /* ignore */ }

    // Pre-load moon phase PNG
    useEffect(() => {
        const img = new Image()
        img.src = `/moon/${currentHijriDay}.png`
        moonImgRef.current = img
    }, [currentHijriDay])

    // ── Display profile ───────────────────────────────────────────────────────
    const profile = deviceSettings.displayProfile || 'portable-landscape'
    const isPortrait = profile === 'portable-portrait'
    const isPortableLandscape = profile === 'portable-landscape'

    const PROFILE = {
        'desktop': {
            TOP_BAR: 56, BOTTOM_BAR: 32,
            SIDE_INNER: 32, SIDE_OUTER_L: 64, SIDE_OUTER_R: 120,
            showSidePanels: true, showBottomPanel: true, showCornerYears: true,
            eventsMaxW: 'clamp(462px, 52.4vw, 769px)',
            hadithW: 'clamp(271px, 27.1vw, 387.2px)',
            weatherIconSize: 'clamp(72px, 11vw, 140px)',
            weatherTempSize: 'clamp(50px, 7.8vw, 106px)',
            weatherLocSize: 'clamp(22px, 3.1vw, 50px)',
            dateOverlayBottom: null,
        },
        'portable-landscape': {
            TOP_BAR: 44, BOTTOM_BAR: 24,
            SIDE_INNER: 24, SIDE_OUTER_L: 48, SIDE_OUTER_R: 88,
            showSidePanels: false, showBottomPanel: false, showCornerYears: false,
            eventsMaxW: 'clamp(336px, 43.2vw, 456px)',
            hadithW: 'clamp(215.6px, 23.1vw, 330px)',
            weatherIconSize: 'clamp(48px, 8vw, 96px)',
            weatherTempSize: 'clamp(34px, 5.4vw, 72px)',
            weatherLocSize: 'clamp(16px, 2.2vw, 34px)',
            dateOverlayBottom: null,
        },
        'portable-portrait': {
            TOP_BAR: 80, BOTTOM_BAR: 0,
            SIDE_INNER: 0, SIDE_OUTER_L: 0, SIDE_OUTER_R: 0,
            showSidePanels: false, showBottomPanel: false, showCornerYears: false,
            eventsMaxW: '100vw',
            hadithW: 'calc(100vw - 16px)',
            weatherIconSize: 'clamp(36px, 7vw, 64px)',
            weatherTempSize: 'clamp(26px, 4.8vw, 53px)',
            weatherLocSize: 'clamp(14px, 2.4vw, 26px)',
            dateOverlayBottom: null,
        },
    }[profile] || {}

    const TOP_BAR = PROFILE.TOP_BAR
    const BOTTOM_BAR = PROFILE.BOTTOM_BAR
    const SIDE_INNER = PROFILE.SIDE_INNER
    const SIDE_OUTER_L = PROFILE.SIDE_OUTER_L
    const SIDE_OUTER_R = PROFILE.SIDE_OUTER_R
    const SIDE_TOTAL_L = SIDE_INNER + SIDE_OUTER_L
    const SIDE_TOTAL_R = SIDE_INNER + SIDE_OUTER_R

    // ── Screen saver drift ────────────────────────────────────────────────────
    useEffect(() => {
        const el = driftRef.current
        if (!el) return
        if (deviceSettings.screenSaver !== 'Y') {
            el.style.transform = 'translate(0px, 0px)'
            document.body.style.backgroundPosition = '50% 50%'
            return
        }
        const speed = 0.3
        let x = 0, y = 0, dx = speed, dy = speed * 0.7
        const interval = setInterval(() => {
            const canvas = canvasRef.current
            if (!canvas) return
            const rect = canvas.getBoundingClientRect()
            const zoomed = deviceSettings.zoomedIn === 'Y'
            const diffX = Math.abs(window.innerWidth - rect.width) / 2
            const diffY = Math.abs(window.innerHeight - rect.height) / 2
            const maxX = zoomed ? 30 : Math.max(diffX, 30)
            const maxY = zoomed ? 20 : Math.max(diffY, 30)
            x += dx
            y += dy
            if (x >= maxX || x <= -maxX) dx = -dx
            if (y >= maxY || y <= -maxY) dy = -dy
            x = Math.max(-maxX, Math.min(maxX, x))
            y = Math.max(-maxY, Math.min(maxY, y))
            el.style.transform = `translate(${x}px, ${y}px)`
            if (background.length > 0)
                document.body.style.backgroundPosition = `${50 + x * 0.15}% ${50 + y * 0.15}%`
        }, 50)
        return () => clearInterval(interval)
    }, [deviceSettings.screenSaver, deviceSettings.zoomedIn, background])

    return (
        <>
            <PrayerTopBar
                vakits={vakits}
                currentVakit={currentVakit}
                nextVakit={nextVakit}
                time={time}
                TOP_BAR={TOP_BAR}
                SIDE_TOTAL_L={SIDE_TOTAL_L}
                SIDE_TOTAL_R={SIDE_TOTAL_R}
                isPortableLandscape={isPortableLandscape}
                isPortrait={isPortrait}
                dim={dim}
            />

            {PROFILE.showBottomPanel && (
                <BottomPanel
                    locationSettings={locationSettings}
                    currentVakit={currentVakit}
                    BOTTOM_BAR={BOTTOM_BAR}
                    SIDE_TOTAL_L={SIDE_TOTAL_L}
                    SIDE_TOTAL_R={SIDE_TOTAL_R}
                    dim={dim}
                />
            )}

            <SidePanels
                todaysDate={todaysDate}
                hijriDate={hijriDate}
                locationSettings={locationSettings}
                currentVakit={currentVakit}
                PROFILE={PROFILE}
                TOP_BAR={TOP_BAR}
                BOTTOM_BAR={BOTTOM_BAR}
                SIDE_INNER={SIDE_INNER}
                SIDE_OUTER_L={SIDE_OUTER_L}
                SIDE_OUTER_R={SIDE_OUTER_R}
                SIDE_TOTAL_L={SIDE_TOTAL_L}
                SIDE_TOTAL_R={SIDE_TOTAL_R}
            />

            <HadithDisplay
                dailyHadith={dailyHadith}
                hadithExpanded={hadithExpanded}
                setHadithExpanded={setHadithExpanded}
                hadithLang={deviceSettings.hadithLang || 'both'}
                profile={profile}
                PROFILE={PROFILE}
                TOP_BAR={TOP_BAR}
                SIDE_TOTAL_R={SIDE_TOTAL_R}
                dim={dim}
            />

            <EventsPanel
                eventsData={eventsData}
                eventsCount={Number(deviceSettings.eventsCount) || 3}
                profile={profile}
                PROFILE={PROFILE}
                TOP_BAR={TOP_BAR}
                BOTTOM_BAR={BOTTOM_BAR}
                SIDE_TOTAL_L={SIDE_TOTAL_L}
                dim={dim}
                DATE_OVERLAY_H={isPortrait ? 'calc(clamp(22px, 3.4vw, 56px) * 1.15 + clamp(28px, 4.2vw, 68px) * 1.15 + 18px)' : null}
            />

            <DateOverlay
                todaysDate={todaysDate}
                hijriDate={hijriDate}
                locationSettings={locationSettings}
                currentVakit={currentVakit}
                profile={profile}
                BOTTOM_BAR={BOTTOM_BAR}
                SIDE_TOTAL_L={SIDE_TOTAL_L}
                SIDE_TOTAL_R={SIDE_TOTAL_R}
                isPortrait={isPortrait}
                isPortableLandscape={isPortableLandscape}
                dim={dim}
            />

            <WeatherDisplay
                weatherData={weatherData}
                currentVakit={currentVakit}
                currentHijriDay={currentHijriDay}
                locationSettings={locationSettings}
                profile={profile}
                PROFILE={PROFILE}
                TOP_BAR={TOP_BAR}
                SIDE_TOTAL_L={SIDE_TOTAL_L}
                clockStyle={deviceSettings.clockStyle || 'A'}
            />

            <MainDial
                canvasRef={canvasRef}
                hourAngle={hourAngle}
                vakits={vakits}
                arcVakits={arcVakits}
                displayTime={displayTime}
                currentVakit={currentVakit}
                nextVakit={nextVakit}
                currentArcVakit={currentArcVakit}
                nextText={nextText}
                elapsed={elapsed}
                midnightAngle={midnightAngle}
                oneThirdAngle={oneThirdAngle}
                twoThirdAngle={twoThirdAngle}
                alarmSettings={alarmSettings}
                naflAlarmSettings={naflAlarmSettings}
                isWeekDay={isWeekDay}
                dim={dim}
                deviceSettings={deviceSettings}
                background={background}
                locationSettings={locationSettings}
                weatherData={weatherData}
                currentHijriDay={currentHijriDay}
                moonImgRef={moonImgRef}
                hourImgRef={hourImgRef}
                minuteImgRef={minuteImgRef}
                profile={profile}
                tick={tick}
            />

            <div className='d-flex flex-row h-100 align-items-center justify-content-center'
                style={{
                    overflow: 'hidden',
                    paddingTop: TOP_BAR,
                    paddingBottom: BOTTOM_BAR,
                    paddingLeft: SIDE_TOTAL_L,
                    paddingRight: SIDE_TOTAL_R,
                    justifyContent: isPortrait ? 'center' : 'flex-start',
                    alignItems: 'center',
                }}>
                <div ref={driftRef}>
                    <div ref={dragWrapperRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onClick={handleClick}
                        style={{ touchAction: 'none', cursor: 'grab' }}>
                        <canvas id="clockCanvas" className="img-fluid"
                            style={{ opacity: clockOpacity, transform: deviceSettings.zoomedIn === 'Y' ? 'scale(2.2) translateY(-3%)' : 'none' }}
                            width={size} height={size} ref={canvasRef} ></canvas>
                    </div>
                </div>
            </div>
        </>
    );
}
