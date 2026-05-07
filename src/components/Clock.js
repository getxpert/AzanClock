import React, { useContext, useEffect, useRef, useState } from 'react'
import { AppContext } from '../AppContext';
import { format12 } from '../scripts/SmartAzanClock'
import { HijriMonths } from '../data/Common'
import tempColourConfig from '../data/temperatureColours.json'
import { EventsService } from '../services/EventsService'
import { Audios } from '../data/Audios'

// ── Hadith of the day ─────────────────────────────────────────────────────────
// Parsed once at module load from /hadiths.csv (TSV format)
let _hadiths = null
const loadHadiths = async () => {
    if (_hadiths) return _hadiths
    try {
        const res  = await fetch('/hadiths.csv')
        const text = await res.text()
        const rows = text.trim().split('\n').slice(1) // skip header
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

    const { showMenu, setShowMenu, nextText, todaysDate, hijriDate, locationSettings,
        calculationSettings, deviceSettings, hourAngle, vakits, arcVakits, displayTime, currentVakit, nextVakit, currentArcVakit,
        elapsed, background, dim, clockOpacity, midnightAngle, oneThirdAngle, twoThirdAngle, alarmSettings, naflAlarmSettings, isWeekDay, weatherData, time, isAudioPlaying } = useContext(AppContext)
    const canvasRef = useRef(null)
    const driftRef = useRef(null)
    const dragWrapperRef = useRef(null)
    const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, hasMoved: false })

    // Pre-load hand PNGs once — reused every canvas redraw
    const hourImgRef   = useRef(null)
    const minuteImgRef = useRef(null)
    useEffect(() => {
        const h = new Image(); h.src = '/hourhand.png';   hourImgRef.current   = h
        const m = new Image(); m.src = '/minutehand.png'; minuteImgRef.current = m
    }, [])

    // moonImgRef is populated after currentHijriDay is computed (see below)
    const moonImgRef = useRef(null)

    // Tick every second so the canvas redraws and the second hand moves
    const [, setTick] = useState(0)
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 1000)
        return () => clearInterval(id)
    }, [])

    // ── Hadith of the hour — pick randomly, refresh every hour ──────────────
    const [dailyHadith, setDailyHadith] = useState(null)
    const [hadithExpanded, setHadithExpanded] = useState(true)
    useEffect(() => {
        const pickRandom = (hadiths) => {
            if (!hadiths.length) return
            setDailyHadith(hadiths[Math.floor(Math.random() * hadiths.length)])
            setHadithExpanded(true)
        }
        loadHadiths().then(pickRandom)

        // Align the next swap to the top of the next clock hour
        const scheduleNext = () => {
            const now        = new Date()
            const msToNextHr = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000 - now.getMilliseconds()
            return setTimeout(() => {
                loadHadiths().then(pickRandom)
                // After the first aligned tick, repeat every hour exactly
                const id = setInterval(() => loadHadiths().then(pickRandom), 3600000)
                return () => clearInterval(id)
            }, msToNextHr)
        }
        const timeoutId = scheduleNext()
        return () => clearTimeout(timeoutId)
    }, [])

    // ── Events: refresh active/upcoming + check notifications every minute at second=0 ──
    const [eventsData, setEventsData] = useState({ active: [], upcoming: [] })
    const notifiedRef   = useRef(new Set())
    const notifAudioRef = useRef(null)
    useEffect(() => {
        const notifSrc = Audios.find(a => a.id === 101)?.source

        const tick = async () => {
            if (new Date().getSeconds() !== 0) return

            // ── Refresh active/upcoming panel ────────────────────────────────
            const data = await EventsService.getActiveAndUpcoming(new Date(), 2)
            setEventsData(data)

            // ── Notification check ───────────────────────────────────────────
            if (!isAudioPlaying && notifSrc) {
                const due = await EventsService.getNotificationsDue(new Date())
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
                    audio.play().catch(() => {})
                    break  // one notification at a time
                }
            }
        }

        // Run once immediately on mount (seconds may not be 0, but gets initial data)
        EventsService.getActiveAndUpcoming(new Date(), 2).then(setEventsData)

        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [isAudioPlaying])

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
    const size = 1000; /* size = width = height */
    const black = '#0D0E0F';
    const gray = '#4B4E54';
    const white = 'whitesmoke';
    const silver = 'silver';

    // Arabic prayer names used both on canvas and in the top panel
    const arabicPrayerNames = {
        Imsak:   'الإمساك',
        Fajr:    'الفجر',
        Sunrise: 'الضحى',
        Duha:    'الضحى',
        Dhuhr:   'الظهر',
        Asr:     'العصر',
        Maghrib: 'المغرب',
        Isha:    'العشاء',
    }

    // ── Temperature colour resolver — used both on canvas and in HTML overlay ─
    // Resolve colour bands from the external JSON config (sorted descending by min)
    // localStorage key 'temperatureColours' overrides the bundled default
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

    useEffect(() => {
        const el = driftRef.current
        if (!el) return
        if (deviceSettings.screenSaver !== 'Y') {
            el.style.transform = 'translate(0px, 0px)'
            document.body.style.backgroundPosition = '50% 50%'
            return
        }
        const speed = 0.3 // pixels per frame
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
    }, [deviceSettings.screenSaver, deviceSettings.zoomedIn])

    useEffect(() => {

        const ctx = (canvasRef.current).getContext("2d")

        updateBackground(background);

        const clockStyle   = deviceSettings.clockStyle  || 'A'
        const timeFormat   = deviceSettings.timeFormat   || '12'
        const showDigital  = clockStyle === 'D' || clockStyle === 'B'
        const show24h      = timeFormat === '24'
        const showAnalogue = clockStyle === 'A' || clockStyle === 'B'

        // 24h zero-padded time: "09:05", "13:47" etc.
        const now24        = new Date()
        const hh           = String(now24.getHours()).padStart(2, '0')
        const mm           = String(now24.getMinutes()).padStart(2, '0')
        const bigTime      = show24h ? `${hh}:${mm}` : displayTime

        sac.clearCanvas(ctx)
            .fillCircle(ctx, 490, 0, 0, white, 0.33)
            .fillCircle(ctx, 488, 0, 0, black)
            .drawArcs(ctx, 458, 41)
            .drawNumbers24(ctx, 455, 13, white)
            .drawHand(ctx, midnightAngle, 413, 443, 3.5, black)
            .printAt(ctx, '1/2', 14, white, 403, midnightAngle)
            .drawHand(ctx, oneThirdAngle, 413, 443, 3.5, black)
            .printAt(ctx, '1/3', 14, white, 403, oneThirdAngle)
            .drawHand(ctx, twoThirdAngle, 413, 443, 3.5, black)
            .printAt(ctx, '2/3', 14, white, 403, twoThirdAngle)
            .markAlarms(ctx, 391)
            .drawArrow(ctx, hourAngle, 479, 20, 29, black)
            .drawArrow(ctx, hourAngle, 479, 20, 27, white)
            .drawCircle(ctx, 482, black, 9)

        if (showDigital) {
            // Large time fills the inner dial — font sized to span ~faceR diameter
            sac.print(ctx, bigTime, 220, white, 0)
        }

        if (showAnalogue) {
            // ── Analogue-only text layout ─────────────────────────────────────
            // Compute 12h hand positions (clock-hours 0–12) to find empty space
            const _now  = new Date()
            const _hrs  = _now.getHours() % 12
            const _mins = _now.getMinutes()
            const _secs = _now.getSeconds()
            const _hourPos = (_hrs + _mins / 60)           // 0–12
            const _minPos  = (_mins + _secs / 60) / 5      // 0–12 (minutes mapped to hour positions)

            // Returns true if either hand is within ±1 hour of the given clock position
            const handNear = (pos) => {
                const wrap = (v) => ((v % 12) + 12) % 12
                const diff = (a, b) => Math.min(Math.abs(wrap(a) - wrap(b)), 12 - Math.abs(wrap(a) - wrap(b)))
                return diff(_hourPos, pos) < 1 || diff(_minPos, pos) < 1
            }

            // ── Four candidate positions inside the dial ──────────────────────
            // pos3  = 3 o'clock  (right),  pos9  = 9 o'clock  (left)
            // pos12 = 12 o'clock (top),    pos6  = 6 o'clock  (bottom)
            const pos3Free  = !handNear(3)
            const pos9Free  = !handNear(9)
            const pos12Free = !handNear(0)   // 0 == 12 on a 12h clock
            const pos6Free  = !handNear(6)

            // ── Time block: prefer 3 → 9 → 12 ────────────────────────────────
            let _bx, _by
            if (pos3Free) {
                _bx = 260; _by = 0        // 3 o'clock
            } else if (pos9Free) {
                _bx = -260; _by = 0       // 9 o'clock
            } else {
                _bx = 0; _by = -244       // 12 o'clock
            }

            // ── Weather block: prefer 6 → 12 → 9 ─────────────────────────────
            // (must not collide with the time block position)
            const timeAt9  = _bx === -260 && _by === 0
            const timeAt12 = _bx === 0    && _by === -244

            let _wx, _wy
            if (pos6Free) {
                _wx = 0; _wy = 244        // 6 o'clock
            } else if (pos12Free && !timeAt12) {
                _wx = 0; _wy = -244       // 12 o'clock
            } else if (!timeAt9) {
                _wx = -260; _wy = 0       // 9 o'clock
            } else {
                _wx = 260; _wy = 0        // 3 o'clock (last resort)
            }

            // Draw the three-line block centred at (_bx, _by)
            // Line 1: current prayer name — amber, 52px,  offset -68 from centre
            // Line 2: current time        — white, 104px, offset   0 from centre
            // Line 3: next · in · time    — silver/amber, 44px, offset +75 from centre
            if (currentArcVakit.name !== 'Duhaend')
                sac.printXY(ctx, currentArcVakit.name, 52, '#FFC800', _bx, _by - 68)

            sac.printXY(ctx, bigTime, 104, white, _bx, _by)

            // Next prayer + countdown — tight inline: name · 'in' (amber) · time
            ;(() => {
                const fs = 44, fsIn = 38, gap = 10
                const cx = size / 2, cy = size / 2
                const nameStr = nextVakit.name || ''
                ctx.save()
                ctx.translate(cx, cy)
                ctx.textBaseline = 'middle'
                ctx.textAlign = 'left'
                ctx.font = `bold ${fs}px Arial`
                const wName = ctx.measureText(nameStr).width
                ctx.font = `bold ${fsIn}px Arial`
                const wIn = ctx.measureText('in').width
                ctx.font = `bold ${fs}px Arial`
                const wTime = ctx.measureText(nextText).width
                const totalW = wName + gap + wIn + gap + wTime
                let xCursor = _bx - totalW / 2
                // prayer name
                ctx.font = `bold ${fs}px Arial`
                ctx.fillStyle = silver
                ctx.fillText(nameStr, xCursor, _by + 75)
                xCursor += wName + gap
                // 'in'
                ctx.font = `bold ${fsIn}px Arial`
                ctx.fillStyle = '#FFC800'
                ctx.fillText('in', xCursor, _by + 75)
                xCursor += wIn + gap
                // countdown
                ctx.font = `bold ${fs}px Arial`
                ctx.fillStyle = silver
                ctx.fillText(nextText, xCursor, _by + 75)
                ctx.restore()
            })()

            // ── Weather / moon block drawn inside the dial ────────────────────
            // Only in landscape profile; sized to match the time block (104px icon, 52px temp)
            if (profile === 'landscape' || profile === 'desktop' || profile === 'portable-landscape') {
                const _afterSunset = currentVakit &&
                    (currentVakit.name === 'Maghrib' || currentVakit.name === 'Isha' || currentVakit.name === 'Imsak')

                const _weatherIcon = weatherData ? (() => {
                    const code = weatherData.weatherCode
                    if (code === 0)                          return '☀️'
                    if (code === 1)                          return '🌤️'
                    if (code === 2)                          return '⛅'
                    if (code === 3)                          return '☁️'
                    if (code === 45 || code === 48)          return '🌫️'
                    if (code >= 51 && code <= 57)            return '🌦️'
                    if (code >= 61 && code <= 67)            return '🌧️'
                    if (code >= 71 && code <= 77)            return '❄️'
                    if (code >= 80 && code <= 82)            return '🌧️'
                    if (code >= 85 && code <= 86)            return '🌨️'
                    if (code >= 95 && code <= 99)            return '⛈️'
                    return '🌡️'
                })() : null

                if (weatherData && (_weatherIcon || _afterSunset)) {
                    const cx = size / 2, cy = size / 2
                    const iconSize = 104   // matches time font size
                    const tempSize = 52    // matches prayer name font size

                    // Icon line: centred at (_wx, _wy - tempSize*0.6)
                    // Temp line: centred at (_wx, _wy + iconSize*0.5)
                    const iconY = _wy - tempSize * 0.55
                    const tempY = _wy + iconSize * 0.52

                    if (_afterSunset) {
                        // Moon phase PNG — draw on canvas
                        const moonImg = moonImgRef.current
                        if (moonImg && moonImg.complete && moonImg.naturalWidth > 0) {
                            const imgSize = iconSize * 1.1
                            ctx.save()
                            ctx.translate(cx + _wx - imgSize / 2, cy + iconY - imgSize / 2)
                            ctx.drawImage(moonImg, 0, 0, imgSize, imgSize)
                            ctx.restore()
                        }
                    } else {
                        // Weather emoji
                        ctx.save()
                        ctx.translate(cx, cy)
                        ctx.font = `${iconSize}px Arial`
                        ctx.textBaseline = 'middle'
                        ctx.textAlign = 'center'
                        ctx.fillText(_weatherIcon, _wx, iconY)
                        ctx.restore()
                    }

                    // Temperature text
                    if (weatherData.temperature !== undefined && weatherData.temperature !== null) {
                        const tempColours = getTempColours(weatherData.temperature)
                        ctx.save()
                        ctx.translate(cx, cy)
                        ctx.textBaseline = 'middle'
                        ctx.textAlign = 'center'
                        ctx.font = `bold ${tempSize}px Arial`
                        // Measure parts for two-colour rendering
                        const numStr  = String(weatherData.temperature)
                        const unitStr = '°C'
                        const numW    = ctx.measureText(numStr).width
                        const unitW   = ctx.measureText(unitStr).width
                        const totalTW = numW + unitW
                        // Number
                        ctx.fillStyle = tempColours.number
                        ctx.textAlign = 'left'
                        ctx.fillText(numStr, _wx - totalTW / 2, tempY)
                        // Unit
                        ctx.fillStyle = tempColours.unit
                        ctx.fillText(unitStr, _wx - totalTW / 2 + numW, tempY)
                        ctx.restore()
                    }

                    // Location text — address on one line, country on the next
                    const toTitleCase = (str) => str
                        ? str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                        : null
                    const locAddress = toTitleCase(locationSettings?.address) || null
                    const locCountry = toTitleCase(weatherData.country) || null
                    if (locAddress || locCountry) {
                        const locSize = 26   // smaller than temp, readable inside dial
                        const locLineH = locSize * 1.35
                        // Start just below the temperature line
                        let locY = _wy + iconSize * 0.52 + tempSize * 0.7
                        ctx.save()
                        ctx.translate(cx, cy)
                        ctx.textBaseline = 'middle'
                        ctx.textAlign = 'center'
                        ctx.font = `bold ${locSize}px Arial`
                        ctx.fillStyle = 'rgba(255,255,255,0.85)'
                        if (locAddress) {
                            ctx.fillText(locAddress, _wx, locY)
                            locY += locLineH
                        }
                        if (locCountry) {
                            ctx.fillStyle = 'rgba(200,200,200,0.75)'
                            ctx.fillText(locCountry, _wx, locY)
                        }
                        ctx.restore()
                    }
                }
            }
        } else {
            // ── Digital / Both — original layout ─────────────────────────────
            sac.print(ctx, 'Elapsed ' + elapsed + ' · ' + nextVakit.name + ' in', 31, white, 109)
                .print(ctx, nextText, 156, white, 223)

            if (currentArcVakit.name !== 'Duhaend')
                sac.print(ctx, arabicPrayerNames[currentArcVakit.name] || currentArcVakit.name, 56, white, -191)
        }

        sac.updateTitle(ctx, 'AzanClock • ' + currentVakit.name + ' • Next: ' + nextVakit.name + ' @ ' + nextVakit.time + ' in ' + nextText + ' • ' + locationSettings.address)

        if (showAnalogue)
            sac.drawAnalogueClock(ctx);



    })

    const sac = {
        clearCanvas: (ctx) => {
            ctx.save();
            ctx.translate(0, 0);
            ctx.clearRect(0, 0, size, size);
            ctx.restore();
            return sac;
        },
        drawHand: (ctx, angle, from, to, lineWidth, color) => {
            ctx.save();
            ctx.translate(size / 2, size / 2);
            ctx.beginPath();
            ctx.rotate(angle);
            ctx.moveTo(from, 0);
            ctx.lineTo(to, 0);
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = color;
            ctx.lineCap = "round";
            ctx.stroke();
            ctx.restore();
            return sac;
        },
        fillCircle: (ctx, r, x, y, color, opacity) => {
            if (dim === 1)
                return sac;
            ctx.save();
            ctx.translate(size / 2, size / 2);
            if (opacity)
                ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.restore();
            return sac;
        },
        print: (ctx, text, textSize, color, y) => {
            ctx.save();
            ctx.translate(size / 2, size / 2);
            ctx.font = 'bold ' + Math.floor(textSize) + 'px Arial';
            ctx.fillStyle = color;
            ctx.textBaseline = "middle";
            ctx.textAlign = 'center';
            ctx.fillText(text, 0, y);
            ctx.restore();
            return sac;
        },
        printXY: (ctx, text, textSize, color, x, y) => {
            ctx.save();
            ctx.translate(size / 2, size / 2);
            ctx.font = 'bold ' + Math.floor(textSize) + 'px Arial';
            ctx.fillStyle = color;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillText(text, x, y);
            ctx.restore();
            return sac;
        },
        printAt(ctx, text, textSize, color, r, angle) {
            if (dim === 1)
                return sac;

            ctx.save();
            ctx.translate(size / 2, size / 2);
            ctx.textBaseline = "middle";
            ctx.fillStyle = color;
            ctx.textAlign = "center";
            ctx.font = textSize + "px Arial";
            let ang = angle - Math.PI / 2;
            ctx.rotate(ang);
            ctx.translate(0, r);
            ctx.rotate(-ang);
            ctx.fillText(text, 0, 0);
            ctx.restore();
            return sac;
        },
        updateTitle(ctx, title) {
            document.title = title;
            return sac;
        },
        drawArrow: (ctx, angle, x, width, height, color) => {
            ctx.save();
            ctx.translate(size / 2, size / 2);

            if (dim === 1) {
                width = width / 2.5;
                height = height / 2.5;
                x = x / 1.065;
            }

            ctx.rotate(angle);
            ctx.beginPath();
            // Rounded triangle: tip at (x - height, 0), base corners at (x, ±width)
            const r = Math.min(width, height) * 0.45;
            const tip   = [x - height, 0];
            const baseT = [x, -width];
            const baseB = [x,  width];
            ctx.moveTo((tip[0] + baseT[0]) / 2, (tip[1] + baseT[1]) / 2);
            ctx.arcTo(tip[0],   tip[1],   (tip[0] + baseB[0]) / 2, (tip[1] + baseB[1]) / 2, r);
            ctx.arcTo(baseB[0], baseB[1], (baseB[0] + baseT[0]) / 2, (baseB[1] + baseT[1]) / 2, r);
            ctx.arcTo(baseT[0], baseT[1], (tip[0] + baseT[0]) / 2, (tip[1] + baseT[1]) / 2, r);
            ctx.closePath();
            ctx.fillStyle = (dim === 1 ? silver : color);
            ctx.fill();
            ctx.restore();
            return sac;
        },
        drawIndicator: (ctx, r, angle, color) => {
            ctx.save();
            ctx.translate(size / 2, size / 2);
            ctx.rotate(angle);
            ctx.lineWidth = 2;
            ctx.strokeStyle = black;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(r * 1.076, 0, 9, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.stroke();
            ctx.restore();

        },
        markAlarms: (ctx, r) => {
            alarmSettings.map((a) => {
                if ((a.frequency === 'E') || (a.frequency === 'W' && isWeekDay))
                    sac.drawIndicator(ctx, r, a.angle, 'red')
            });
            naflAlarmSettings.map((a) => {
                sac.drawIndicator(ctx, r, a.angle, 'yellowgreen')
            });
            return sac;
        },
        drawNumbers24: (ctx, r, fontSize, color) => {
            if (dim === 1)
                return sac;

            // ── Minute ring: ticks + labels at 5-min intervals ────────────────
            // r is the radius passed in (455); place ticks just inside that edge
            const tickOuter = r          // outer edge of tick
            const tickInner = r - 18     // long tick (every 5 min)
            const tickInnerSm = r - 10   // short tick (every 1 min)

            for (let m = 0; m < 60; m++) {
                const ang = (m / 60) * Math.PI * 2 - Math.PI / 2
                const isFive = m % 5 === 0
                const inner = isFive ? tickInner : tickInnerSm

                ctx.save()
                ctx.translate(size / 2, size / 2)
                ctx.beginPath()
                ctx.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner)
                ctx.lineTo(Math.cos(ang) * tickOuter, Math.sin(ang) * tickOuter)
                ctx.strokeStyle = isFive ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)'
                ctx.lineWidth = isFive ? 2.5 : 1.2
                ctx.lineCap = 'round'
                ctx.stroke()
                ctx.restore()


            }

            return sac;

        },
        drawArcs: (ctx, r, arcWidth) => {

            // ── Prayer arcs: half-width band, centred so it touches both edges ──
            const outerR = 488
            const bandW  = outerR - r          // full available band (67px)
            const arcW   = bandW / 2            // half thickness
            const midR   = r + bandW / 2        // centre of the band

            let borderPadding = Math.PI / 450;
            for (let i = 0; i < arcVakits.length; i++) {
                ctx.save();
                ctx.translate(size / 2, size / 2);
                ctx.beginPath();

                if (currentArcVakit.index === i) {
                    ctx.strokeStyle = (dim === 1 ? 'gray' : arcVakits[i].color);
                    ctx.lineWidth = arcW;
                    ctx.globalAlpha = 0.95;
                }
                else {
                    ctx.strokeStyle = (dim === 1 ? 'gray' : arcVakits[i].color);
                    ctx.lineWidth = arcW;
                    ctx.globalAlpha = 0.45;
                }
                ctx.arc(0, 0, midR, arcVakits[i].startAngle24(), arcVakits[i].endAngle24() - borderPadding, false);
                ctx.stroke();
                ctx.restore();
            }
            return sac;
        },
        drawCircle: (ctx, r, color, lineWidth, opacity) => {
            ctx.save();
            ctx.translate(size / 2, size / 2);
            if (opacity)
                ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
            ctx.restore();
            return sac;
        },
        arcText: (ctx, mode, text, fontSize, distanceFromCenter, color) => {

            if (text === '#vakits#') {
                text = '';
                for (let v in vakits) {
                    text += vakits[v].name + ' ' + format12(vakits[v].time);
                    if (v * 1 !== (vakits.length - 1) * 1)
                        text += ' · ';
                }
            }

            text = text.replace(/,/g, '')

            let startAngle = 0;
            ctx.font = 'bold ' + fontSize + 'px Calibiri';

            ctx.fillStyle = color;
            if (mode === 'top') {
                startAngle = -ctx.measureText(text).width / (2 * distanceFromCenter);
            }
            else {
                startAngle = ctx.measureText(text).width / (2 * distanceFromCenter);
            }

            let charWidth = {}
            for (var j = 0; j < text.length; j++) {
                charWidth[text[j]] = ctx.measureText(text[j]).width;
            }

            var thisSpace = 0;
            for (var i = 0; i < text.length; i++) {
                thisSpace += charWidth[text[i]] / distanceFromCenter;
                ctx.save();

                if (text[i] === '·')
                    ctx.fillStyle = 'yellow';

                ctx.translate(size / 2, size / 2);
                ctx.textAlign = "right";
                if (mode === 'top') {
                    ctx.rotate(startAngle + thisSpace);
                    ctx.fillText(text[i], 0, -distanceFromCenter);
                }
                else {
                    ctx.rotate(startAngle - thisSpace);
                    ctx.fillText(text[i], 0, distanceFromCenter);
                }

                ctx.restore();
            }
            return sac;
        },
        // Analogue clock — fills the inner circle using PNG hands
        drawAnalogueClock: (ctx) => {
            const now  = new Date();
            const hrs  = now.getHours() % 12;
            const mins = now.getMinutes();
            const secs = now.getSeconds();

            const cx    = size / 2;
            const cy    = size / 2;
            const faceR = 370;

            // ── PNG hand helper ───────────────────────────────────────────────
            // img        — HTMLImageElement
            // angle      — rotation in radians (0 = 12 o'clock)
            // imgW/imgH  — natural pixel size of the PNG (857×168)
            // pivotX/Y   — pivot point within the PNG (165, 85)
            // targetTip  — desired canvas distance from centre to tip of hand
            const drawPngHand = (img, angle, imgW, imgH, pivotX, pivotY, targetTip) => {
                if (!img || !img.complete || img.naturalWidth === 0) return;
                // The PNG points rightward; 12 o'clock needs -π/2 offset
                const tipLen = imgW - pivotX;          // pixels from pivot to tip in PNG
                const scale  = targetTip / tipLen;     // uniform scale to fit canvas
                const dw     = imgW * scale;
                const dh     = imgH * scale;
                const dx     = -pivotX * scale;        // shift so pivot lands at (0,0)
                const dy     = -pivotY * scale;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(angle - Math.PI / 2);       // -π/2 maps rightward PNG → 12 o'clock
                ctx.drawImage(img, dx, dy, dw, dh);
                ctx.restore();
            };

            // ── Hour hand ─────────────────────────────────────────────────────
            const hourAng = ((hrs + mins / 60) / 12) * Math.PI * 2;
            drawPngHand(hourImgRef.current, hourAng, 857, 168, 165, 85, faceR * 1.16);

            // ── Minute hand ───────────────────────────────────────────────────
            const minAng = ((mins + secs / 60) / 60) * Math.PI * 2;
            drawPngHand(minuteImgRef.current, minAng, 857, 168, 165, 85, faceR * 1.16);

            // ── Second hand (red line) ────────────────────────────────────────
            const secAng = (secs / 60) * Math.PI * 2 - Math.PI / 2;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(secAng);
            ctx.beginPath();
            ctx.moveTo(-faceR * 0.18, 0);
            ctx.lineTo(faceR * 1.1, 0);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth   = 3;
            ctx.lineCap     = 'round';
            ctx.shadowColor = 'rgba(239,68,68,0.8)';
            ctx.shadowBlur  = 8;
            ctx.stroke();
            ctx.restore();

            // ── Centre pivot ──────────────────────────────────────────────────
            ctx.save();
            ctx.translate(cx, cy);
            ctx.beginPath();
            ctx.arc(0, 0, 11, 0, Math.PI * 2);
            ctx.fillStyle   = 'rgba(255,255,255,0.9)';
            ctx.shadowColor = 'rgba(0,0,0,0.9)';
            ctx.shadowBlur  = 8;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fillStyle  = '#ef4444';
            ctx.shadowBlur = 0;
            ctx.fill();
            ctx.restore();

            return sac;
        },
    }

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

    // ── Border panel helpers ──────────────────────────────────────────────────

    // Derive current Gregorian day/month/year from todaysDate context value
    const now = new Date()
    const tzID = locationSettings?.timeZoneID || 'UTC'
    const localNow = new Date(now.toLocaleString('en-US', { timeZone: tzID }))
    const currentGregorianDay   = localNow.getDate()
    const currentGregorianMonth = localNow.getMonth()       // 0-based
    const currentGregorianYear  = localNow.getFullYear()
    const daysInMonth = new Date(currentGregorianYear, currentGregorianMonth + 1, 0).getDate()

    // Derive current Hijri day/month from hijriDate string e.g. "3 Rajab 1446"
    // Month name may contain spaces (e.g. "Rabi Al-Awwal"), so take everything
    // between the first token (day) and the last token (year) as the month name.
    let currentHijriDay = 1, currentHijriMonth = 1, currentHijriYear = 1446
    try {
        const hParts = hijriDate ? hijriDate.split(' ') : []
        if (hParts.length >= 3) {
            currentHijriDay   = parseInt(hParts[0], 10)
            currentHijriYear  = parseInt(hParts[hParts.length - 1], 10)
            const monthName   = hParts.slice(1, hParts.length - 1).join(' ')
            currentHijriMonth = HijriMonths.indexOf(monthName) + 1   // 1-based; 0 if not found → stays 1
        }
    } catch (e) { /* ignore */ }

    // Days in current Hijri month — approximate using JS Islamic calendar
    let daysInHijriMonth = 30
    try {
        const hijriMonthStart = new Date(now.toLocaleString('en-US', { timeZone: tzID }))
        hijriMonthStart.setDate(hijriMonthStart.getDate() - currentHijriDay + 1)
        // Count forward until the Hijri month changes
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

    // Current hour (0-23)
    const currentHour = localNow.getHours()

    // Pre-load moon phase PNG for canvas drawing — refreshes when Hijri day changes
    // (placed here so currentHijriDay is already defined)
    useEffect(() => {
        const img = new Image()
        img.src = `/moon/${currentHijriDay}.png`
        moonImgRef.current = img
    }, [currentHijriDay])

    // ── Display profile — drives all layout constants ────────────────────────
    const profile = deviceSettings.displayProfile || 'portable-landscape'
    const isPortrait  = profile === 'portable-portrait'
    const isPortableLandscape = profile === 'portable-landscape'

    // Per-profile layout values
    const PROFILE = {
        'desktop': {
            TOP_BAR: 56, BOTTOM_BAR: 32,
            SIDE_INNER: 32, SIDE_OUTER_L: 64, SIDE_OUTER_R: 120,
            showSidePanels: true, showBottomPanel: true, showCornerYears: true,
            eventsMaxW: 'clamp(462px, 52.4vw, 769px)',
            hadithW: 'clamp(224px, 22.4vw, 320px)',
            weatherIconSize: 'clamp(72px, 11vw, 140px)',
            weatherTempSize: 'clamp(42px, 6.5vw, 88px)',
            weatherLocSize: 'clamp(18px, 2.6vw, 42px)',
            dateOverlayBottom: null,   // null = use BOTTOM_BAR + 12 (fixed bottom)
        },

        'portable-landscape': {
            TOP_BAR: 44, BOTTOM_BAR: 24,
            SIDE_INNER: 24, SIDE_OUTER_L: 48, SIDE_OUTER_R: 88,
            showSidePanels: false, showBottomPanel: false, showCornerYears: false,
            eventsMaxW: 'clamp(336px, 43.2vw, 456px)',
            hadithW: 'clamp(160px, 17.6vw, 256px)',
            weatherIconSize: 'clamp(48px, 8vw, 96px)',
            weatherTempSize: 'clamp(28px, 4.5vw, 60px)',
            weatherLocSize: 'clamp(13px, 1.8vw, 28px)',
            dateOverlayBottom: null,
        },

        'portable-portrait': {
            TOP_BAR: 40, BOTTOM_BAR: 0,
            SIDE_INNER: 0, SIDE_OUTER_L: 0, SIDE_OUTER_R: 0,
            showSidePanels: false, showBottomPanel: false, showCornerYears: false,
            eventsMaxW: 'min(96vw, 480px)',
            hadithW: null,
            weatherIconSize: 'clamp(36px, 7vw, 64px)',
            weatherTempSize: 'clamp(22px, 4vw, 44px)',
            weatherLocSize: 'clamp(12px, 2vw, 22px)',
            dateOverlayBottom: null,
        },
             /*   'landscape': {
            TOP_BAR: 44, BOTTOM_BAR: 24,
            SIDE_INNER: 24, SIDE_OUTER_L: 48, SIDE_OUTER_R: 88,
            showSidePanels: true, showBottomPanel: true, showCornerYears: true,
            eventsMaxW: 'clamp(280px, 36vw, 480px)',
            hadithW: 'clamp(200px, 22vw, 320px)',
            weatherIconSize: 'clamp(48px, 8vw, 96px)',
            weatherTempSize: 'clamp(28px, 4.5vw, 60px)',
            weatherLocSize: 'clamp(13px, 1.8vw, 28px)',
            dateOverlayBottom: null,
        },
                'portrait': {
            TOP_BAR: 40, BOTTOM_BAR: 0,
            SIDE_INNER: 0, SIDE_OUTER_L: 0, SIDE_OUTER_R: 0,
            showSidePanels: false, showBottomPanel: false, showCornerYears: false,
            eventsMaxW: 'min(96vw, 480px)',
            hadithW: null,   // hidden in portrait
            weatherIconSize: 'clamp(36px, 7vw, 64px)',
            weatherTempSize: 'clamp(22px, 4vw, 44px)',
            weatherLocSize: 'clamp(12px, 2vw, 22px)',
            dateOverlayBottom: null,
        },*/
    }[profile] || {}

    // Shared panel style constants
    const TOP_BAR       = PROFILE.TOP_BAR
    const BOTTOM_BAR    = PROFILE.BOTTOM_BAR
    const SIDE_INNER    = PROFILE.SIDE_INNER
    const SIDE_OUTER_L  = PROFILE.SIDE_OUTER_L
    const SIDE_OUTER_R  = PROFILE.SIDE_OUTER_R
    const SIDE_TOTAL_L  = SIDE_INNER + SIDE_OUTER_L // total left margin
    const SIDE_TOTAL_R  = SIDE_INNER + SIDE_OUTER_R // total right margin
    const calibri       = "'Calibri', 'Calibri Light', 'Candara', 'Segoe UI', sans-serif"
    const panelBg       = 'rgba(0,0,0,0.55)'
    const hlColor       = '#000'
    const dimColor      = 'rgba(255,255,255,1)'
    const hlBg          = 'rgba(255, 200, 0, 0.85)'   // amber — used by side day panels

    // ── Highlight colour helpers ──────────────────────────────────────────────

    // Convert "H:MM" or "HH:MM" to total minutes since midnight
    const toMins = (t) => {
        if (!t) return 0
        const [h, m] = t.split(':').map(Number)
        return h * 60 + m
    }

    // Minutes from now until a future time (wraps midnight)
    const minsUntil = (targetTime) => {
        const nowMins = toMins(time)
        const tMins   = toMins(targetTime)
        return tMins >= nowMins ? tMins - nowMins : 1440 - nowMins + tMins
    }

    // Prayer bar: colour based on minutes remaining until this prayer's end
    // (i.e. time until the NEXT prayer starts)
    const prayerHlBg = (vakit) => {
        if (!currentVakit || vakit.name !== currentVakit.name || vakit.time !== currentVakit.time)
            return 'transparent'
        const mins = minsUntil(nextVakit.time)
        if (mins > 60)  return 'rgba(34, 197, 94, 0.85)'   // green  — >1 hour left
        if (mins > 15)  return 'rgba(255, 200, 0, 0.85)'   // amber  — 15–60 min left
        return             'rgba(239, 68, 68, 0.85)'        // red    — ≤15 min left
    }

    // Hour bar: colour based on minutes elapsed since the hour started
    const hourHlBg = (h) => {
        if (h !== currentHour) return 'transparent'
        const minsPast = localNow.getMinutes()
        if (minsPast < 30)  return 'rgba(34, 197, 94, 0.85)'   // green  — <30 min past
        if (minsPast < 45)  return 'rgba(255, 200, 0, 0.85)'   // amber  — 30–45 min past
        return                  'rgba(239, 68, 68, 0.85)'       // red    — ≥45 min past
    }

    // Right (Hijri day) bar: colour based on current prayer time
    const hijriDayHlBg = (day) => {
        if (day !== currentHijriDay) return 'transparent'
        const name = currentVakit?.name
        if (name === 'Asr')   return 'rgba(239, 68, 68, 0.85)'   // red   — Asr time
        if (name === 'Dhuhr') return 'rgba(255, 200, 0, 0.85)'   // amber — Dhuhr time
        return                    'rgba(34, 197, 94, 0.85)'       // green — all other times
    }
    const dayHlBg = (day) => {
        if (day !== currentGregorianDay) return 'transparent'
        const h = localNow.getHours()
        if (h < 12)  return 'rgba(34, 197, 94, 0.85)'   // green  — before noon
        if (h < 18)  return 'rgba(255, 200, 0, 0.85)'   // amber  — noon to 6pm
        return           'rgba(239, 68, 68, 0.85)'       // red    — after 6pm
    }

    // Side-panel font: size each cell so 31 items fill the full available height
    const sideCellHeight = `calc((100vh - ${TOP_BAR + BOTTOM_BAR}px) / 31)`
    const sideFontSize   = `calc((100vh - ${TOP_BAR + BOTTOM_BAR}px) / 31 * 0.58)`
    // Arabic prayer names (proper Arabic script) — reuses arabicPrayerNames defined above
    const arabicNames = arabicPrayerNames

    // ── Top panel: prayer times (RTL — Fajr on right, Isha on left) ──────────
    const TopPanel = () => {
        const rtlVakits = vakits ? [...vakits].reverse() : []
        // Responsive font: scales with viewport width, clamped between 11px and 28px
        const prayerFont = isPortableLandscape
            ? `clamp(11px, ${TOP_BAR * 0.52}px, 3.2vw)`
            : `clamp(11px, ${TOP_BAR * 0.52}px, 2.2vw)`
        const timeFont = "'Orbitron', 'Courier New', 'Lucida Console', monospace"
        return (
            <div style={{
                position: 'fixed', top: 0, left: isPortableLandscape ? 0 : SIDE_TOTAL_L, right: isPortableLandscape ? 0 : SIDE_TOTAL_R, height: TOP_BAR,
                background: panelBg, display: 'flex', alignItems: 'stretch',
                overflow: 'hidden', zIndex: 100, fontFamily: calibri,
            }}>
                {rtlVakits.map((v, i) => {
                    const isCurrent = currentVakit && v.name === currentVakit.name && v.time === currentVakit.time
                    return (
                        <div key={i} style={{
                            flex: 1,
                            display: 'flex', flexDirection: 'row',
                            alignItems: 'center', justifyContent: 'center',
                            padding: '0 8px',
                            fontWeight: isCurrent ? 'bold' : 'normal',
                            color: isCurrent ? hlColor : dimColor,
                            background: prayerHlBg(v),
                            borderRadius: 6,
                            overflow: 'hidden',
                            gap: 10,
                        }}>
                            {/* Arabic name */}
                            <span style={{
                                fontSize: prayerFont,
                                direction: 'rtl',
                                whiteSpace: 'nowrap',
                            }}>
                                {arabicNames[v.name] || v.name}
                            </span>
                            {/* Time — digital font + AM/PM superscript */}
                            <span style={{
                                display: 'inline-flex', alignItems: 'baseline',
                                gap: 3, direction: 'ltr', whiteSpace: 'nowrap',
                            }}>
                                <span style={{
                                    fontSize: prayerFont,
                                    fontFamily: calibri, //timeFont
                                    letterSpacing: '0.04em',
                                }}>
                                    {v.displayTime}
                                </span>
                                <span style={{
                                    fontSize: `clamp(7px, ${TOP_BAR * 0.27}px, 1.1vw)`,
                                    fontFamily: calibri,
                                    letterSpacing: 0,
                                    opacity: 0.85,
                                }}>
                                    {parseInt(v.time.split(':')[0], 10) < 12 ? 'AM' : 'PM'}
                                </span>
                            </span>
                        </div>
                    )
                })}
            </div>
        )
    }

    // ── Bottom panel: days of week — English (left half) + Arabic (right half) ─
    // After Maghrib the Islamic day has already advanced, so the day-of-week
    // shown in the Arabic panel and the Islamic date overlay must also advance.
    const isAfterMaghrib = currentVakit &&
        (currentVakit.name === 'Maghrib' || currentVakit.name === 'Isha' || currentVakit.name === 'Imsak')
    // Islamic day-of-week: if after Maghrib, use tomorrow's Gregorian weekday
    const islamicDayOfWeek = isAfterMaghrib
        ? (localNow.getDay() + 1) % 7
        : localNow.getDay()
    const currentDayOfWeek = islamicDayOfWeek

    // English days: Mon–Sun (index 0=Mon … 6=Sun, mapped to JS getDay 1–0)
    const enDays = [
        { label: 'Mon', jsDay: 1, weekend: false },
        { label: 'Tue', jsDay: 2, weekend: false },
        { label: 'Wed', jsDay: 3, weekend: false },
        { label: 'Thu', jsDay: 4, weekend: false },
        { label: 'Fri', jsDay: 5, weekend: false },
        { label: 'Sat', jsDay: 6, weekend: true  },
        { label: 'Sun', jsDay: 0, weekend: true  },
    ]

    // Arabic days: Al-Ahad (Sun) … Al-Sabt (Sat), ordered Sun–Sat to match Islamic week
    // Friday (jsDay 5) is highlighted green; all others amber
    const arDays = [
        { label: 'الأحد',    jsDay: 0 },  // Al-Ahad   — Sunday
        { label: 'الاثنين',  jsDay: 1 },  // Al-Ithnayn — Monday
        { label: 'الثلاثاء', jsDay: 2 },  // Al-Thulatha — Tuesday
        { label: 'الأربعاء', jsDay: 3 },  // Al-Arbi'a — Wednesday
        { label: 'الخميس',   jsDay: 4 },  // Al-Khamis — Thursday
        { label: 'الجمعة',   jsDay: 5 },  // Al-Jumu'a — Friday
        { label: 'السبت',    jsDay: 6 },  // Al-Sabt   — Saturday
    ]

    const BottomPanel = () => (
        <div style={{
            position: 'fixed', bottom: 0, left: SIDE_TOTAL_L, right: SIDE_TOTAL_R, height: BOTTOM_BAR,
            background: panelBg, display: 'flex', alignItems: 'stretch',
            overflow: 'hidden', zIndex: 100,
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
                            ? 'rgba(34, 197, 94, 0.85)'    // green  — weekend
                            : 'rgba(255, 200, 0, 0.85)')   // amber  — weekday
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
                            ? 'rgba(34, 197, 94, 0.85)'    // green  — Friday
                            : 'rgba(255, 200, 0, 0.85)')   // amber  — other days
                        : 'transparent'
                    return (
                        <div key={label} style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16,
                            fontWeight: isToday ? 'bold' : 'normal',
                            color: isToday ? hlColor : dimColor,
                            background: bg,
                            borderRadius: 3,
                            whiteSpace: 'nowrap',
                        }}>{label}</div>
                    )
                })}
            </div>
        </div>
    )
    // ── Left panel: Gregorian days of month ───────────────────────────────────
    const LeftPanel = () => (
        <div style={{
            position: 'fixed', top: TOP_BAR, left: SIDE_OUTER_L, bottom: BOTTOM_BAR, width: SIDE_INNER,
            background: panelBg, display: 'flex', flexDirection: 'column',
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
    )

    // ── Right panel: Hijri days of month ──────────────────────────────────────
    const RightPanel = () => (
        <div style={{
            position: 'fixed', top: TOP_BAR, right: SIDE_OUTER_R, bottom: BOTTOM_BAR, width: SIDE_INNER,
            background: panelBg, display: 'flex', flexDirection: 'column',
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
    )

    // ── Weather icon + temperature overlay (top-left of clock area) ─────────

    // After sunset (Maghrib, Isha, Imsak) show moon phase PNG instead of weather emoji
    const afterSunset = currentVakit &&
        (currentVakit.name === 'Maghrib' || currentVakit.name === 'Isha' || currentVakit.name === 'Imsak')

    const weatherIcon = weatherData ? (() => {
        const code = weatherData.weatherCode;
        if (code === 0)                          return '☀️';
        if (code === 1)                          return '🌤️';
        if (code === 2)                          return '⛅';
        if (code === 3)                          return '☁️';
        if (code === 45 || code === 48)          return '🌫️';
        if (code >= 51 && code <= 57)            return '🌦️';
        if (code >= 61 && code <= 67)            return '🌧️';
        if (code >= 71 && code <= 77)            return '❄️';
        if (code >= 80 && code <= 82)            return '🌧️';
        if (code >= 85 && code <= 86)            return '🌨️';
        if (code >= 95 && code <= 99)            return '⛈️';
        return '🌡️';
    })() : null;

    return (
        <>
            {/* Top-left corner: app icon — desktop only */}
            {profile === 'desktop' && <div style={{
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
            </div>}

            {/* Top-right corner: نور الصلاة — desktop only */}
            {profile === 'desktop' && <div style={{
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
            </div>}

            {/* Noor us Sa'at — narrow portrait panel, top-right of clock area */}
            {dailyHadith && PROFILE.hadithW && (
                <div
                    onClick={() => setHadithExpanded(e => !e)}
                    style={{
                        position: 'fixed',
                        top: TOP_BAR + 10,
                        right: profile === 'portable-landscape' ? 10 : SIDE_TOTAL_R + 10,
                        // Narrow portrait card — wide enough for wrapped Arabic text, won't reach the dial
                        width: PROFILE.hadithW,
                        // portable-landscape: stretch from just past the right dial edge to the right screen edge
                        ...(profile === 'portable-landscape'
                            ? {
                                left: 'calc((100vw + 91vh) / 2 + 8px)',
                                right: 10,
                                width: 'auto',
                              }
                            : {}
                        ),
                        background: 'rgba(0,0,0,0.72)',
                        borderRadius: 10,
                        border: '1px solid rgba(74,222,128,0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        zIndex: 97,
                        padding: '16px 20px',
                        gap: 12,
                        overflow: 'visible',
                        fontFamily: calibri,
                        textShadow: '0 1px 4px rgba(0,0,0,0.95)',
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        userSelect: 'none',
                    }}>
                    {/* Arabic hadith text — always visible */}
                    <span style={{
                        color: 'white',
                        fontSize: 'clamp(20px, 2.0vw, 26px)',
                        lineHeight: 1.75,
                        textAlign: 'right',
                        direction: 'rtl',
                        wordBreak: 'break-word',
                    }}>{dailyHadith.arabic}</span>

                    {/* English translation + reference — only shown when expanded */}
                    {hadithExpanded && (<>
                        {/* Divider */}
                        <div style={{
                            width: '100%', height: 1,
                            background: 'rgba(255,255,255,0.15)',
                        }} />

                        {/* English translation */}
                        <span style={{
                            color: 'white',
                            fontSize: 'clamp(18px, 1.8vw, 24px)',
                            lineHeight: 1.5,
                            textAlign: 'left',
                            direction: 'ltr',
                            wordBreak: 'break-word',
                            fontStyle: 'italic',
                        }}>{dailyHadith.english}</span>

                        {/* Reference + Type */}
                        <span style={{
                            color: '#fbbf24',
                            fontSize: 'clamp(18px, 1.7vw, 22px)',
                            lineHeight: 1.3,
                            textAlign: 'left',
                            direction: 'ltr',
                            fontWeight: 'bold',
                            marginTop: 2,
                        }}>{dailyHadith.type && `${dailyHadith.type} · `}{dailyHadith.reference}</span>
                    </>)}

                    {/* Collapsed hint — shown only when not expanded */}
                    {!hadithExpanded && (
                        <span style={{
                            color: 'rgba(251,191,36,0.7)',
                            fontSize: 'clamp(13px, 1.3vw, 16px)',
                            textAlign: 'center',
                            fontStyle: 'italic',
                            flexShrink: 0,
                        }}>tap to read translation</span>
                    )}
                </div>
            )}

            {/* Bottom-left corner: current Gregorian year, straight */}
            {PROFILE.showCornerYears && <div style={{
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
            </div>}

            {/* Bottom-right corner: current Hijri year, straight */}
            {PROFILE.showCornerYears && <div style={{
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
            </div>}

            {/* Outer left bar: months of the year Jan–Dec with day-progress highlight */}
            {PROFILE.showSidePanels && <div style={{
                position: 'fixed', top: TOP_BAR, left: 0, bottom: BOTTOM_BAR,
                width: SIDE_OUTER_L,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'stretch', overflow: 'hidden', zIndex: 100,
                fontFamily: calibri,
            }}>
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((name, i) => {
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
            </div>}

            {/* Outer right bar: Islamic months in Arabic, Muharram–Dhul Hijjah */}
            {PROFILE.showSidePanels && <div style={{
                position: 'fixed', top: TOP_BAR, right: 0, bottom: BOTTOM_BAR,
                width: SIDE_OUTER_R,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'stretch', overflow: 'hidden', zIndex: 100,
                fontFamily: calibri,
            }}>
                {[
                    'مُحَرَّم','صَفَر','رَبيع الأوَّل','رَبيع الثاني',
                    'جُمادى الأولى','جُمادى الآخِرة','رَجَب','شَعبان',
                    'رَمَضان','شَوَّال','ذو القَعدة','ذو الحِجَّة'
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
            </div>}

            <TopPanel />
            {PROFILE.showBottomPanel && <BottomPanel />}
            {PROFILE.showSidePanels && <LeftPanel />}
            {PROFILE.showSidePanels && <RightPanel />}

            {/* ── Events panel — top-left for portable-landscape; lower-left otherwise ── */}
            {(() => {
                const { active, upcoming } = eventsData
                if (active.length === 0 && upcoming.length === 0) return null

                const isPortLand = profile === 'portable-landscape'
                return (
                    <div style={{
                        position: 'fixed',
                        // portable-landscape: full left gutter from screen edge to dial edge
                        // all others: lower-left, above date overlay
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
                        // portable-landscape: scroll vertically
                        ...(isPortLand ? { overflowY: 'auto', overflowX: 'hidden' } : {}),
                    }}>
                        {/* Active events — larger box + fonts */}
                        {active.map((ev, i) => (
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
                                {/* NOW badge — straight, top-left corner, half above the box */}
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
                                {/* Title row */}
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
                                {/* Second line — description */}
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
                                {/* Third line — time remaining · assigned to */}
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
                        {upcoming.map((ev, i) => {
                            const occDate = ev.nextOccurrence
                            const occHH   = String(occDate.getHours()).padStart(2, '0')
                            const occMM   = String(occDate.getMinutes()).padStart(2, '0')
                            const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
                            const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                            const occWhen = `${occHH}:${occMM} ${DAY_NAMES[occDate.getDay()]}, ${MONTH_NAMES[occDate.getMonth()]} ${occDate.getDate()}`
                            // Append days+hours if more than 24h away
                            const diffMins = Math.ceil((occDate - new Date()) / 60000)
                            const occLabel = diffMins > 24 * 60
                                ? (() => {
                                    const days  = Math.floor(diffMins / (24 * 60))
                                    const hours = Math.floor((diffMins % (24 * 60)) / 60)
                                    return `${occWhen} · ${hours > 0 ? `${days}d ${hours}h` : `${days}d`}`
                                })()
                                : occWhen
                            // Badge label: Today / Tomorrow / In X days
                            // Compare calendar dates (midnight-to-midnight) not raw ms diff
                            const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0)
                            const occMidnight   = new Date(occDate); occMidnight.setHours(0,0,0,0)
                            const calDays = Math.round((occMidnight - todayMidnight) / 86400000)
                            const whenBadge = calDays === 0 ? 'Today'
                                : calDays === 1 ? 'Tomorrow'
                                : `In ${calDays} days`
                            // Badge colour: green=Today, amber=Tomorrow, blue-ish=further
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
                                {/* Badge — straight, top-left corner, half above the box */}
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
                                {/* Title row */}
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
                                {/* Second line — scheduled time */}
                                <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                                    <span style={{
                                        color: 'white',
                                        fontSize: 'clamp(13px, 1.5vw, 18px)',
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap',
                                    }}>📅 {occLabel}</span>
                                </div>
                                {/* Third line — remaining · assigned to */}
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
            })()}

            {/* ── Gregorian date overlay — bottom-left, between side bars and clock circle ── */}
            {(() => {
                const enDayNames   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
                const enMonthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                const dayName   = enDayNames[localNow.getDay()]
                const monthName = enMonthNames[currentGregorianMonth]
                const isWeekend = localNow.getDay() === 0 || localNow.getDay() === 6
                const accentColor = isWeekend ? '#4ade80' : '#fbbf24'
                const textShadow  = '0 2px 4px rgba(0,0,0,1), 0 4px 12px rgba(0,0,0,0.95), 0 8px 24px rgba(0,0,0,0.85), 2px 2px 0 rgba(0,0,0,0.9), -2px -2px 0 rgba(0,0,0,0.9)'
                return (
                    <div style={{
                        position: 'fixed',
                        bottom: BOTTOM_BAR + 12,
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
                    }}>
                        {/* Day name — top line in portable-landscape */}
                        <span style={{
                            fontSize: 'clamp(22px, 3.4vw, 56px)',
                            fontWeight: 'normal',
                            lineHeight: 1.15,
                            color: accentColor,
                        }}>{dayName}</span>
                        {/* Date line: Month Day, Year */}
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                            {/* Month name — white, large */}
                            <span style={{
                                fontSize: 'clamp(28px, 4.2vw, 68px)',
                                fontWeight: 'bold',
                                lineHeight: 1.15,
                                color: 'rgba(255,255,255,0.92)',
                            }}>{monthName}</span>
                            {/* Day number — amber weekday, green weekend, large */}
                            <span style={{
                                fontSize: 'clamp(28px, 4.2vw, 68px)',
                                fontWeight: 'bold',
                                lineHeight: 1.15,
                                color: accentColor,
                            }}>{currentGregorianDay},</span>
                            {/* Year — same size as day name, white */}
                            <span style={{
                                fontSize: 'clamp(22px, 3.4vw, 56px)',
                                fontWeight: 'normal',
                                lineHeight: 1.15,
                                color: 'rgba(255,255,255,0.85)',
                            }}>{currentGregorianYear}</span>
                        </div>
                    </div>
                )
            })()}

            {/* ── Islamic date overlay — bottom-right (hidden in portrait) ── */}
            {!isPortrait && (() => {
                const arabicHijriMonths = [
                    'مُحَرَّم','صَفَر','رَبيع الأوَّل','رَبيع الثاني',
                    'جُمادى الأولى','جُمادى الآخِرة','رَجَب','شَعبان',
                    'رَمَضان','شَوَّال','ذو القَعدة','ذو الحِجَّة'
                ]
                const arabicDayName = arDays.find(d => d.jsDay === currentDayOfWeek)?.label ?? ''
                const arabicMonthName = arabicHijriMonths[(currentHijriMonth - 1)] ?? ''
                // Convert digits to Eastern Arabic numerals
                const toArabicNumerals = (n) =>
                    String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])
                const arabicDay  = toArabicNumerals(currentHijriDay)
                const arabicYear = toArabicNumerals(currentHijriYear)
                const isFriday   = currentDayOfWeek === 5
                const isRamadan  = currentHijriMonth === 9
                return (
                    <>
                    <div style={{
                        position: 'fixed',
                        bottom: BOTTOM_BAR + 12,
                        right: isPortableLandscape ? 10 : SIDE_TOTAL_R + 16,
                        zIndex: 98,
                        display: 'flex',
                        flexDirection: isPortableLandscape ? 'column' : 'row',
                        alignItems: isPortableLandscape ? 'flex-end' : 'baseline',
                        gap: isPortableLandscape ? 2 : 12,
                        direction: 'rtl',
                        pointerEvents: 'none',
                        fontFamily: calibri,
                        textShadow: '0 2px 4px rgba(0,0,0,1), 0 4px 12px rgba(0,0,0,0.95), 0 8px 24px rgba(0,0,0,0.85), 2px 2px 0 rgba(0,0,0,0.9), -2px -2px 0 rgba(0,0,0,0.9)',
                        whiteSpace: 'nowrap',
                    }}>
                        {/* Day name — in portable-landscape rendered separately at right edge; in other modes inline here */}
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
                        {/* Date line: day number · month · year */}
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 12, direction: 'rtl', justifyContent: 'flex-end' }}>
                            {/* Day number — always white */}
                            <span style={{
                                fontSize: 'clamp(28px, 4.2vw, 68px)',
                                fontWeight: 'bold',
                                lineHeight: 1.15,
                                color: 'rgba(255,255,255,0.92)',
                            }}>{arabicDay}</span>
                            {/* Month name — green in Ramadan, amber otherwise */}
                            <span style={{
                                fontSize: 'clamp(28px, 4.2vw, 68px)',
                                fontWeight: 'bold',
                                lineHeight: 1.15,
                                color: isRamadan ? '#4ade80' : '#fbbf24',
                            }}>{arabicMonthName}</span>
                            {/* Hijri year */}
                            <span style={{
                                fontSize: 'clamp(22px, 3.4vw, 56px)',
                                fontWeight: 'normal',
                                lineHeight: 1.15,
                                color: 'rgba(255,255,255,0.85)',
                            }}>{arabicYear} هـ</span>
                        </div>
                    </div>
                    {/* Day name for portable-landscape — pinned to right screen edge, above the date line */}
                    {isPortableLandscape && (
                        <span style={{
                            position: 'fixed',
                            bottom: `calc(${BOTTOM_BAR + 12}px + clamp(32px, 4.83vw, 78px) + 4px)`,
                            right: 10,
                            zIndex: 98,
                            fontSize: 'clamp(28px, 4.2vw, 68px)',
                            fontWeight: 'bold',
                            lineHeight: 1.15,
                            color: isFriday ? '#4ade80' : '#fbbf24',
                            textAlign: 'right',
                            direction: 'rtl',
                            pointerEvents: 'none',
                            fontFamily: calibri,
                            textShadow: '0 2px 4px rgba(0,0,0,1), 0 4px 12px rgba(0,0,0,0.95), 0 8px 24px rgba(0,0,0,0.85), 2px 2px 0 rgba(0,0,0,0.9), -2px -2px 0 rgba(0,0,0,0.9)',
                            whiteSpace: 'nowrap',
                        }}>{arabicDayName}</span>
                    )}
                    </>
                )
            })()}

            {/* Weather overlay — top-left corner of the clock viewport area */}
            {weatherData && (weatherIcon || afterSunset) && (() => {
                const tempColours = getTempColours(weatherData.temperature);
                const toTitleCase = (str) => str
                    ? str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                    : null;
                const locationAddress = toTitleCase(locationSettings?.address) || null;
                const locationCountry = toTitleCase(weatherData.country) || null;
                // In landscape/desktop/portable-landscape: weather is drawn on canvas — hide HTML overlay
                if (profile === 'landscape' || profile === 'desktop' || profile === 'portable-landscape')
                    return null;
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
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.4em' }}>
                            {afterSunset ? (
                                /* Moon phase PNG — filename matches Islamic day of month */
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
                            ) : (
                                <span style={{
                                    fontSize: PROFILE.weatherIconSize,
                                    lineHeight: 1,
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.95)) drop-shadow(0 4px 12px rgba(0,0,0,0.85)) drop-shadow(0 0 20px rgba(0,0,0,0.7))',
                                }}>{weatherIcon}</span>
                            )}
                            <span style={{
                                fontFamily: "'Orbitron', 'Courier New', monospace",
                                fontSize: PROFILE.weatherTempSize,
                                fontWeight: 'bold',
                                textShadow: '0 2px 4px rgba(0,0,0,1), 0 4px 12px rgba(0,0,0,0.95), 0 8px 24px rgba(0,0,0,0.85), 2px 2px 0 rgba(0,0,0,0.9), -2px -2px 0 rgba(0,0,0,0.9)',
                                letterSpacing: '0.04em',
                                lineHeight: 1,
                            }}>
                                {/* Number stays white, °C gets the band colour */}
                                <span style={{ color: tempColours.number }}>{weatherData.temperature}</span>
                                <span style={{ color: tempColours.unit }}>°C</span>
                            </span>
                        </div>
                        {/* Divider line */}
                        <div style={{
                            width: '100%',
                            height: 2,
                            background: 'rgba(255,255,255,0.35)',
                            borderRadius: 1,
                            margin: '10px 0 8px 0',
                        }} />
                        {/* Location: address on first line, country on second */}
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
                                {locationCountry && (
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
                                    }}>{locationCountry}</span>
                                )}
                            </div>
                        )}
                    </div>
                );
            })()}
            <div className='d-flex flex-row h-100 align-items-center justify-content-center'
                style={{
                    overflow: 'hidden',
                    paddingTop: TOP_BAR,
                    paddingBottom: BOTTOM_BAR,
                    paddingLeft: SIDE_TOTAL_L,
                    paddingRight: SIDE_TOTAL_R,
                    justifyContent: 'flex-start',
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
