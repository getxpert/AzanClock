import React, { useContext, useEffect, useRef } from 'react'
import { AppContext } from '../AppContext';
import { format12 } from '../scripts/SmartAzanClock'

export default function Clock() {

    const { showMenu, setShowMenu, nextText, todaysDate, hijriDate, locationSettings,
        deviceSettings, hourAngle, vakits, arcVakits, displayTime, currentVakit, nextVakit, currentArcVakit,
        elapsed, background, dim, clockOpacity, midnightAngle, oneThirdAngle, twoThirdAngle, alarmSettings, naflAlarmSettings, isWeekDay } = useContext(AppContext)
    const canvasRef = useRef(null)
    const driftRef = useRef(null)
    const dragWrapperRef = useRef(null)
    const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0, hasMoved: false })

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

    const black = '#0D0E0F';
    const white = 'whitesmoke';
    const silver = 'silver';

    // Prayer colors as requested
    const prayerColors = {
        fajr: '#0000FF',    // Blue
        dhuhr: '#FFBF00',   // Amber
        asr: '#008000',     // Green
        maghrib: '#FFA500', // Orange
        isha: '#000080',    // Navy
        grey: '#808080'     // Grey for time between fajr and dhuhr
    };

    // Arabic prayer names
    const arabicPrayerNames = {
        fajr: 'الفجر',
        dhuhr: 'الظهر',
        asr: 'العصر',
        maghrib: 'المغرب',
        isha: 'العشاء',
        grey: 'الgrey'
    };

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
    }, [deviceSettings.screenSaver, deviceSettings.zoomedIn])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        
        // Set canvas size to match display size
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = rect.height
        
        const ctx = canvas.getContext("2d")
        updateBackground(background)
        drawClock(ctx)
        
        // Add resize handler
        const handleResize = () => {
            const rect = canvas.getBoundingClientRect()
            canvas.width = rect.width
            canvas.height = rect.height
            drawClock(ctx)
        }
        window.addEventListener('resize', handleResize)
        
        // Add animation loop for smooth rotation
        let animationFrameId
        const animate = () => {
            drawClock(ctx)
            animationFrameId = requestAnimationFrame(animate)
        }
        animate()
        
        return () => {
            window.removeEventListener('resize', handleResize)
            cancelAnimationFrame(animationFrameId)
        }
    })

    const drawClock = (ctx) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const width = canvas.width
        const height = canvas.height

        // Calculate radius based on screen dimensions - use smaller of width/2 or height/2
        // Center is at middle of screen for full circle
        const radius = Math.min(width / 2, height / 2) * 0.85

        // Clear canvas
        ctx.clearRect(0, 0, width, height)

        // Save context for transformations
        ctx.save()

        // Translate to center of screen
        const centerX = width / 2
        const centerY = height / 2
        ctx.translate(centerX, centerY)

        // Rotate so that current time is at the top (12 o'clock position)
        // hourAngle is calculated from 12 o'clock going clockwise for 24 hours
        const rotationAngle = -hourAngle
        ctx.rotate(rotationAngle)

        // Draw full circle background with semi-transparent dark color
        ctx.beginPath()
        ctx.arc(0, 0, radius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(13, 14, 15, 0.7)' // Semi-transparent dark
        ctx.fill()

        // Draw prayer time bands in the full circle (24 hours)
        drawPrayerBands(ctx, radius)

        // Draw time markers (24-hour format)
        drawTimeMarkers(ctx, radius)

        // Draw current time indicator (at top)
        drawCurrentTimeIndicator(ctx, radius)

        // Restore context
        ctx.restore()

        // Draw static UI elements (outside rotation)
        drawStaticUI(ctx, width, height, radius)
    }

    const drawPrayerBands = (ctx, radius) => {
        // Get prayer times from vakits array
        const fajr = vakits.find(v => v.name === 'Fajr')
        const dhuhr = vakits.find(v => v.name === 'Dhuhr')
        const asr = vakits.find(v => v.name === 'Asr')
        const maghrib = vakits.find(v => v.name === 'Maghrib')
        const isha = vakits.find(v => v.name === 'Isha')

        if (!fajr || !dhuhr || !asr || !maghrib || !isha) return

        const fajrTime = getMinutesFromTime(fajr.time)
        const dhuhrTime = getMinutesFromTime(dhuhr.time)
        const asrTime = getMinutesFromTime(asr.time)
        const maghribTime = getMinutesFromTime(maghrib.time)
        const ishaTime = getMinutesFromTime(isha.time)

        // Convert to angles for 24-hour full circle (0 to 2π)
        // 24 hours = 1440 minutes
        // angle = timeInMinutes * 2π / 1440
        const toAngle = (minutes) => {
            return (minutes * 2 * Math.PI / 1440)
        }

        const fajrAngle = toAngle(fajrTime)
        const dhuhrAngle = toAngle(dhuhrTime)
        const asrAngle = toAngle(asrTime)
        const maghribAngle = toAngle(maghribTime)
        const ishaAngle = toAngle(ishaTime)

        const bandWidth = radius * 0.12
        const bandRadius = radius * 0.85

        // Draw Isha band (Navy) - from 0 (midnight) to Fajr
        drawBand(ctx, bandRadius, 0, fajrAngle, prayerColors.isha, bandWidth)

        // Draw Fajr band (Blue)
        drawBand(ctx, bandRadius, fajrAngle, dhuhrAngle, prayerColors.fajr, bandWidth)

        // Draw Dhuhr band (Amber)
        drawBand(ctx, bandRadius, dhuhrAngle, asrAngle, prayerColors.dhuhr, bandWidth)

        // Draw Asr band (Green)
        drawBand(ctx, bandRadius, asrAngle, maghribAngle, prayerColors.asr, bandWidth)

        // Draw Maghrib band (Orange)
        drawBand(ctx, bandRadius, maghribAngle, ishaAngle, prayerColors.maghrib, bandWidth)

        // Draw Isha band (Navy) - from Isha to midnight (2π)
        drawBand(ctx, bandRadius, ishaAngle, Math.PI * 2, prayerColors.isha, bandWidth)

        // Draw labels for prayer times with times
        drawPrayerLabels(ctx, radius, fajrAngle, dhuhrAngle, asrAngle, maghribAngle, ishaAngle)
    }

    const drawBand = (ctx, radius, startAngle, endAngle, color, width) => {
        if (startAngle >= endAngle) return
        
        ctx.beginPath()
        ctx.arc(0, 0, radius, startAngle, endAngle)
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.stroke()
    }

    const drawPrayerLabels = (ctx, radius, fajrAngle, dhuhrAngle, asrAngle, maghribAngle, ishaAngle) => {
        const fontSize = Math.floor(radius * 0.055)
        const timefontSize = Math.floor(radius * 0.04)
        ctx.font = `bold ${fontSize}px Calibri`

        // Get prayer times for display
        const fajr = vakits.find(v => v.name === 'Fajr')
        const dhuhr = vakits.find(v => v.name === 'Dhuhr')
        const asr = vakits.find(v => v.name === 'Asr')
        const maghrib = vakits.find(v => v.name === 'Maghrib')
        const isha = vakits.find(v => v.name === 'Isha')

        // Fajr label - in the middle of Fajr band
        const fajrMidAngle = (fajrAngle + dhuhrAngle) / 2
        drawLabelWithTime(ctx, arabicPrayerNames.fajr, fajr?.displayTime, radius, fajrMidAngle, fontSize, timefontSize)

        // Dhuhr label - in the middle of Dhuhr band
        const dhuhrMidAngle = (dhuhrAngle + asrAngle) / 2
        drawLabelWithTime(ctx, arabicPrayerNames.dhuhr, dhuhr?.displayTime, radius, dhuhrMidAngle, fontSize, timefontSize)

        // Asr label - in the middle of Asr band
        const asrMidAngle = (asrAngle + maghribAngle) / 2
        drawLabelWithTime(ctx, arabicPrayerNames.asr, asr?.displayTime, radius, asrMidAngle, fontSize, timefontSize)

        // Maghrib label - in the middle of Maghrib band
        const maghribMidAngle = (maghribAngle + ishaAngle) / 2
        drawLabelWithTime(ctx, arabicPrayerNames.maghrib, maghrib?.displayTime, radius, maghribMidAngle, fontSize, timefontSize)

        // Isha label - in the middle of Isha band (between Isha and midnight/Fajr)
        // Isha band wraps around midnight, so we need to handle it specially
        const ishaMidAngle = (ishaAngle + (2 * Math.PI + fajrAngle)) / 2
        drawLabelWithTime(ctx, arabicPrayerNames.isha, isha?.displayTime, radius, ishaMidAngle, fontSize, timefontSize)
    }

    const drawLabelWithTime = (ctx, text, time, radius, angle, fontSize, timeFont) => {
        ctx.save()
        ctx.translate(0, 0)
        ctx.rotate(angle)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        // Add text shadow for better visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
        ctx.shadowBlur = 8
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        
        // Draw prayer name
        ctx.font = `bold ${fontSize}px Calibri`
        ctx.fillStyle = white
        ctx.fillText(text, 0, -radius * 0.85)
        
        // Draw prayer time below name
        if (time) {
            ctx.font = `bold ${timeFont}px Arial`
            ctx.fillStyle = white
            ctx.fillText(time, 0, -radius * 0.78)
        }
        
        // Reset shadow
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        
        ctx.restore()
    }

    const drawTimeMarkers = (ctx, radius) => {
        const markerRadius = radius * 0.95
        const fontSize = Math.floor(radius * 0.04)
        ctx.font = `bold ${fontSize}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = white

        // Add text shadow for better visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
        ctx.shadowBlur = 6
        ctx.shadowOffsetX = 1
        ctx.shadowOffsetY = 1

        // Draw 24-hour markers (0-23)
        for (let h = 0; h < 24; h++) {
            const angle = (h * 2 * Math.PI / 24)
            const x = Math.sin(angle) * markerRadius
            const y = -Math.cos(angle) * markerRadius
            
            // Format hour display
            let hourText = h.toString().padStart(2, '0')
            if (h === 0) hourText = '00'
            
            ctx.fillText(hourText, x, y)
        }

        // Draw minute dots
        ctx.shadowBlur = 3
        for (let m = 0; m < 144; m++) {
            ctx.save()
            ctx.translate(0, 0)
            ctx.textBaseline = "middle"
            ctx.fillStyle = white
            ctx.textAlign = "center"
            let ang = m * 2 * Math.PI / 144
            ctx.rotate(ang)
            ctx.translate(0, markerRadius * 0.985)
            if (m % 6 === 0) {
                // Hour marker - skip, we already drew numbers
            } else {
                ctx.font = radius * 0.03 + "px Arial"
                ctx.fillText(".", 0, 0)
            }
            ctx.restore()
        }

        // Reset shadow
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
    }

    const drawCurrentTimeIndicator = (ctx, radius) => {
        const indicatorRadius = radius * 0.9
        const indicatorWidth = radius * 0.03
        const indicatorHeight = radius * 0.15

        ctx.save()
        ctx.rotate(-hourAngle) // Rotate back to position at top

        // Draw current time indicator at top (12 o'clock position)
        ctx.fillStyle = white
        ctx.beginPath()
        ctx.moveTo(-indicatorWidth, -indicatorRadius)
        ctx.lineTo(indicatorWidth, -indicatorRadius)
        ctx.lineTo(0, -indicatorRadius - indicatorHeight)
        ctx.closePath()
        ctx.fill()

        ctx.restore()
    }

    const drawStaticUI = (ctx, width, height, radius) => {
        const centerX = width / 2
        const centerY = height / 2

        // Font sizes - make dates larger and more visible
        const remainingFontSize = Math.floor(radius * 0.06)
        const prayerFontSize = Math.floor(radius * 0.15)
        const timeFontSize = Math.floor(radius * 0.25)
        const dateFontSize = Math.floor(radius * 0.055)

        // Add text shadow for better visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
        ctx.shadowBlur = 10
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2

        // Current time at center
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `bold ${timeFontSize}px Arial`
        ctx.fillStyle = white
        ctx.fillText(displayTime, centerX, centerY + radius * 0.05)

        // Current prayer name in Arabic (above time)
        ctx.font = `bold ${prayerFontSize}px Calibri`
        ctx.fillStyle = white
        const currentPrayerName = arabicPrayerNames[currentVakit.name.toLowerCase()] || currentVakit.name
        ctx.fillText(currentPrayerName, centerX, centerY - radius * 0.15)

        // Remaining time (above prayer name)
        ctx.font = `bold ${remainingFontSize}px Arial`
        ctx.fillStyle = white
        const remainingText = `${nextText} remaining`
        ctx.fillText(remainingText, centerX, centerY - radius * 0.3)

        // English date in top left corner - larger and more visible
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.font = `bold ${dateFontSize}px Arial`
        ctx.fillStyle = white
        
        // Parse and format English date nicely
        const englishDateParts = todaysDate.split(' ')
        const dayOfWeek = englishDateParts[0] || ''
        const dayNum = englishDateParts[1] || ''
        const month = englishDateParts[2] || ''
        const year = englishDateParts[3] || ''
        
        const leftMargin = 20
        const topMargin = 20
        
        ctx.fillText(dayOfWeek, leftMargin, topMargin)
        ctx.fillText(`${dayNum} ${month} ${year}`, leftMargin, topMargin + dateFontSize * 1.3)

        // Hijri date in top right corner - larger and in Arabic
        ctx.textAlign = 'right'
        ctx.textBaseline = 'top'
        ctx.font = `bold ${dateFontSize}px Calibri`
        ctx.fillStyle = white
        
        const rightMargin = width - 20
        
        // Parse hijri date
        const hijriParts = hijriDate.split(' ')
        const hijriDay = hijriParts[0] || ''
        const hijriMonth = hijriParts[1] || ''
        const hijriYear = hijriParts[2] || ''
        
        // Display hijri date in Arabic format
        ctx.fillText(hijriDate, rightMargin, topMargin)
        
        // Add day of week in Arabic if available
        const arabicDays = {
            'Sunday': 'الأحد',
            'Monday': 'الإثنين',
            'Tuesday': 'الثلاثاء',
            'Wednesday': 'الأربعاء',
            'Thursday': 'الخميس',
            'Friday': 'الجمعة',
            'Saturday': 'السبت'
        }
        const arabicDayOfWeek = arabicDays[dayOfWeek] || ''
        if (arabicDayOfWeek) {
            ctx.fillText(arabicDayOfWeek, rightMargin, topMargin + dateFontSize * 1.3)
        }

        // Reset shadow
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
    }

    const getMinutesFromTime = (timeStr) => {
        if (!timeStr) return 0
        const parts = timeStr.split(':')
        return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }

    const updateBackground = (bg) => {
        if (bg.length > 0) {
            document.body.style.backgroundImage = 'url(' + bg + ')'
            document.body.style.backgroundSize = '110% 110%'
            document.body.style.backgroundRepeat = 'no-repeat'
        } else {
            document.body.style.backgroundImage = null
            document.body.style.backgroundSize = null
            document.body.style.backgroundRepeat = null
            document.body.style.backgroundPosition = null
        }
    }

    return (
        <div className='d-flex flex-row h-100 align-items-center justify-content-center'
            style={{ overflow: 'hidden' }}>
            <div ref={driftRef}>
                <div ref={dragWrapperRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onClick={handleClick}
                    style={{ touchAction: 'none', cursor: 'grab' }}>
                    <canvas id="clockCanvas" className="img-fluid"
                        style={{ opacity: clockOpacity, transform: deviceSettings.zoomedIn === 'Y' ? 'scale(2.2) translateY(-3%)' : 'none' }}
                        width={window.innerWidth} height={window.innerHeight} ref={canvasRef}></canvas>
                </div>
            </div>
        </div>
    )
}
