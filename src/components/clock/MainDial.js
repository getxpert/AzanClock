import React, { useEffect, useRef } from 'react'
import { format12 } from '../../scripts/SmartAzanClock'
import tempColourConfig from '../../data/temperatureColours.json'

const size = 1000
const black = '#0D0E0F'
const gray = '#4B4E54'
const white = 'whitesmoke'
const silver = 'silver'

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

export default function MainDial({
    canvasRef,
    hourAngle,
    vakits,
    arcVakits,
    displayTime,
    currentVakit,
    nextVakit,
    currentArcVakit,
    nextText,
    elapsed,
    midnightAngle,
    oneThirdAngle,
    twoThirdAngle,
    alarmSettings,
    naflAlarmSettings,
    isWeekDay,
    dim,
    deviceSettings,
    background,
    locationSettings,
    weatherData,
    currentHijriDay,
    moonImgRef,
    hourImgRef,
    minuteImgRef,
    profile,
    tick
}) {
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

    useEffect(() => {
        const ctx = canvasRef.current.getContext("2d")

        const clockStyle = deviceSettings.clockStyle || 'A'
        const timeFormat = deviceSettings.timeFormat || '12'
        const showDigital = clockStyle === 'D' || clockStyle === 'B'
        const show24h = timeFormat === '24'
        const showAnalogue = clockStyle === 'A' || clockStyle === 'B'

        // 24h zero-padded time
        const now24 = new Date()
        const hh = String(now24.getHours()).padStart(2, '0')
        const mm = String(now24.getMinutes()).padStart(2, '0')
        const bigTime = show24h ? `${hh}:${mm}` : displayTime

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
            // Fit the time string — use a fixed reference "00:00" so both 12h and 24h
            // get the same font size regardless of how many digits the current time has
            const innerR = 448
            const targetW = innerR * 2 * 0.72 * 1.3
            let timeFontSize = showAnalogue ? 120 : 220
            if (!showAnalogue) {
                const refStr = '00:00'
                let lo = 80, hi = 420
                while (hi - lo > 2) {
                    const mid = Math.floor((lo + hi) / 2)
                    ctx.font = `bold ${mid}px Arial`
                    if (ctx.measureText(refStr).width <= targetW) lo = mid
                    else hi = mid
                }
                timeFontSize = lo
            }
            if (dim === 1) ctx.globalAlpha = 0.25
            sac.print(ctx, bigTime, timeFontSize, white, 0)
            if (dim === 1) ctx.globalAlpha = 1
        }

        if (showAnalogue) {
            // Compute 12h hand positions
            const _now = new Date()
            const _hrs = _now.getHours() % 12
            const _mins = _now.getMinutes()
            const _secs = _now.getSeconds()
            const _hourPos = (_hrs + _mins / 60)
            const _minPos = (_mins + _secs / 60) / 5

            const handNear = (pos) => {
                const wrap = (v) => ((v % 12) + 12) % 12
                const diff = (a, b) => Math.min(Math.abs(wrap(a) - wrap(b)), 12 - Math.abs(wrap(a) - wrap(b)))
                return diff(_hourPos, pos) < 1 || diff(_minPos, pos) < 1
            }

            const pos3Free = !handNear(3)
            const pos9Free = !handNear(9)
            const pos12Free = !handNear(0)
            const pos6Free = !handNear(6)

            // Time block position
            let _bx, _by
            if (pos3Free) {
                _bx = 260; _by = 0
            } else if (pos9Free) {
                _bx = -260; _by = 0
            } else {
                _bx = 0; _by = -244
            }

            // Weather block position
            const timeAt9 = _bx === -260 && _by === 0
            const timeAt12 = _bx === 0 && _by === -244

            let _wx, _wy
            if (pos6Free) {
                _wx = 0; _wy = 244
            } else if (pos12Free && !timeAt12) {
                _wx = 0; _wy = -244
            } else if (!timeAt9) {
                _wx = -260; _wy = 0
            } else {
                _wx = 260; _wy = 0
            }

            // Draw time block
            if (currentArcVakit.name !== 'Duhaend')
                sac.printXY(ctx, currentArcVakit.name, 52, dim === 1 ? 'rgba(255,200,0,0.25)' : '#FFC800', _bx, _by - 68)

            if (dim === 1) ctx.globalAlpha = 0.25
            sac.printXY(ctx, bigTime, 120, white, _bx, _by)
            if (dim === 1) ctx.globalAlpha = 1

            // Next prayer + countdown
            ;(() => {
                const fs = 44, fsIn = 38, fsTime = 74, gap = 10
                const cx = size / 2, cy = size / 2
                const nameStr = nextVakit.name || ''
                ctx.save()
                ctx.translate(cx, cy)
                if (dim === 1) ctx.globalAlpha = 0.25
                ctx.textBaseline = 'middle'
                ctx.textAlign = 'left'
                ctx.font = `bold ${fs}px Arial`
                const wName = ctx.measureText(nameStr).width
                ctx.font = `bold ${fsIn}px Arial`
                const wIn = ctx.measureText('in').width
                ctx.font = `bold ${fsTime}px Arial`
                const wTime = ctx.measureText(nextText).width
                const totalW = wName + gap + wIn + gap + wTime
                let xCursor = _bx - totalW / 2
                ctx.font = `bold ${fs}px Arial`
                ctx.fillStyle = silver
                ctx.fillText(nameStr, xCursor, _by + 75)
                xCursor += wName + gap
                ctx.font = `bold ${fsIn}px Arial`
                ctx.fillStyle = '#FFC800'
                ctx.fillText('in', xCursor, _by + 75)
                xCursor += wIn + gap
                ctx.font = `bold ${fsTime}px Arial`
                ctx.fillStyle = silver
                ctx.fillText(nextText, xCursor, _by + 75)
                ctx.restore()
            })()

            // Weather / moon block inside dial
            if (profile === 'landscape' || profile === 'desktop' || profile === 'portable-landscape' || profile === 'portable-portrait') {
                const _afterSunset = currentVakit &&
                    (currentVakit.name === 'Maghrib' || currentVakit.name === 'Isha' || currentVakit.name === 'Imsak')

                const _weatherIcon = weatherData ? (() => {
                    const code = weatherData.weatherCode
                    if (code === 0) return '☀️'
                    if (code === 1) return '🌤️'
                    if (code === 2) return '⛅'
                    if (code === 3) return '☁️'
                    if (code === 45 || code === 48) return '🌫️'
                    if (code >= 51 && code <= 57) return '🌦️'
                    if (code >= 61 && code <= 67) return '🌧️'
                    if (code >= 71 && code <= 77) return '❄️'
                    if (code >= 80 && code <= 82) return '🌧️'
                    if (code >= 85 && code <= 86) return '🌨️'
                    if (code >= 95 && code <= 99) return '⛈️'
                    return '🌡️'
                })() : null

                // Show if: moon phase after sunset OR weather data available OR location available
                const hasLocation = locationSettings?.address
                const showMoon = _afterSunset
                const showWeather = weatherData && _weatherIcon
                
                if (showMoon || showWeather || hasLocation) {
                    const cx = size / 2, cy = size / 2
                    const iconSize = 104
                    const tempSize = 74

                    const iconY = _wy - tempSize * 0.55
                    const tempY = _wy + iconSize * 0.52

                    // Show moon or weather icon
                    if (_afterSunset) {
                        const moonImg = moonImgRef.current
                        if (moonImg && moonImg.complete && moonImg.naturalWidth > 0) {
                            const imgSize = iconSize * 1.1
                            ctx.save()
                            ctx.translate(cx + _wx - imgSize / 2, cy + iconY - imgSize / 2)
                            ctx.drawImage(moonImg, 0, 0, imgSize, imgSize)
                            ctx.restore()
                        }
                    } else if (_weatherIcon) {
                        ctx.save()
                        ctx.translate(cx, cy)
                        ctx.font = `${iconSize}px Arial`
                        ctx.textBaseline = 'middle'
                        ctx.textAlign = 'center'
                        ctx.fillText(_weatherIcon, _wx, iconY)
                        ctx.restore()
                    }

                    // Temperature text - only if weather data available
                    if (weatherData?.temperature !== undefined && weatherData?.temperature !== null) {
                        const tempColours = getTempColours(weatherData.temperature)
                        ctx.save()
                        ctx.translate(cx, cy)
                        ctx.textBaseline = 'middle'
                        ctx.textAlign = 'center'
                        ctx.font = `bold ${tempSize}px Arial`
                        const numStr = String(weatherData.temperature)
                        const unitStr = '°C'
                        const numW = ctx.measureText(numStr).width
                        const unitW = ctx.measureText(unitStr).width
                        const totalTW = numW + unitW
                        ctx.fillStyle = tempColours.number
                        ctx.textAlign = 'left'
                        ctx.fillText(numStr, _wx - totalTW / 2, tempY)
                        ctx.fillStyle = tempColours.unit
                        ctx.fillText(unitStr, _wx - totalTW / 2 + numW, tempY)
                        ctx.restore()
                    }

                    // Location text - always show if available
                    const toTitleCase = (str) => str
                        ? str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                        : null
                    const locAddress = toTitleCase(locationSettings?.address) || null
                    if (locAddress) {
                        const locSize = 31
                        const locLineH = locSize * 1.35
                        // Adjust Y position based on whether we have temperature
                        let locY = weatherData?.temperature !== undefined 
                            ? _wy + iconSize * 0.52 + tempSize * 0.7
                            : _wy + iconSize * 0.52
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
                        ctx.restore()
                    }
                }
            }
        } else {
            // Digital-only layout:
            //   [prayer name — white, large]
            //   [icon/moon]  [temp — same size as prayer name]
            //   [location — amber]
            //   [big time — centred at y=0, drawn by showDigital block above]
            //   [elapsed — amber]
            //   [countdown]

            const _afterSunset = currentVakit &&
                (currentVakit.name === 'Maghrib' || currentVakit.name === 'Isha' || currentVakit.name === 'Imsak')

            const _weatherIcon = weatherData ? (() => {
                const code = weatherData.weatherCode
                if (code === 0) return '☀️'
                if (code === 1) return '🌤️'
                if (code === 2) return '⛅'
                if (code === 3) return '☁️'
                if (code === 45 || code === 48) return '🌫️'
                if (code >= 51 && code <= 57) return '🌦️'
                if (code >= 61 && code <= 67) return '🌧️'
                if (code >= 71 && code <= 77) return '❄️'
                if (code >= 80 && code <= 82) return '🌧️'
                if (code >= 85 && code <= 86) return '🌨️'
                if (code >= 95 && code <= 99) return '⛈️'
                return '🌡️'
            })() : null

            const showMoon = _afterSunset
            const showWeather = weatherData && _weatherIcon
            const cx = size / 2, cy = size / 2

            // Font sizes
            const salahFontSize = 80   // prayer name
            const tempFontSize  = 104  // temp 30% bigger
            const iconSize      = 104  // icon 30% bigger
            const locFontSize   = 36

            // Vertical stack — everything centred, sitting above the time (y=0)
            // Work bottom-up: leave ~30px gap above y=0 for the time's ascender
            const gap = 18
            const locH    = locFontSize
            const tempH   = tempFontSize
            const salahH  = salahFontSize

            // Bottom of stack: location sits just above the time
            const locY    = -(tempH + gap + locH / 2 + gap + 20) - 10      // ≈ -184
            const tempRowY = locY - locH / 2 - gap - tempH / 2 + 10         // ≈ -264
            const salahY  = tempRowY - tempH / 2 - gap - salahH / 2 + 25    // ≈ -347

            // ── Prayer name — white, centred ──────────────────────────────────
            if (currentArcVakit.name !== 'Duhaend') {
                ctx.save()
                ctx.translate(cx, cy)
                ctx.font = `bold ${salahFontSize}px Arial`
                ctx.fillStyle = dim === 1 ? 'rgba(255,255,255,0.25)' : white
                ctx.textBaseline = 'middle'
                ctx.textAlign = 'center'
                ctx.fillText(currentArcVakit.name, 0, salahY)
                ctx.restore()
            }

            // ── Icon + temp row — centred ─────────────────────────────────────
            if (showMoon || showWeather) {
                const numStr = (weatherData?.temperature !== undefined && weatherData?.temperature !== null)
                    ? String(weatherData.temperature) : ''
                const unitStr = '°C'
                ctx.font = `bold ${tempFontSize}px Arial`
                const numW  = numStr ? ctx.measureText(numStr).width : 0
                const unitW = numStr ? ctx.measureText(unitStr).width : 0
                const totalTW = numW + unitW

                const iconGap  = 12
                const rowW     = iconSize + (totalTW > 0 ? iconGap + totalTW : 0)
                const rowLeft  = -rowW / 2   // centre the whole group
                const iconCx   = rowLeft + iconSize / 2
                const tempLeft = rowLeft + iconSize + iconGap

                // Moon or weather icon
                if (_afterSunset) {
                    const moonImg = moonImgRef.current
                    if (moonImg && moonImg.complete && moonImg.naturalWidth > 0) {
                        const imgSize = iconSize * 1.1
                        ctx.save()
                        ctx.translate(cx + iconCx - imgSize / 2, cy + tempRowY - imgSize / 2)
                        ctx.drawImage(moonImg, 0, 0, imgSize, imgSize)
                        ctx.restore()
                    }
                } else if (_weatherIcon) {
                    ctx.save()
                    ctx.translate(cx, cy)
                    ctx.font = `${iconSize}px Arial`
                    ctx.textBaseline = 'middle'
                    ctx.textAlign = 'center'
                    ctx.fillText(_weatherIcon, iconCx, tempRowY)
                    ctx.restore()
                }

                // Temperature
                if (numStr) {
                    const tempColours = getTempColours(weatherData.temperature)
                    ctx.save()
                    ctx.translate(cx, cy)
                    ctx.textBaseline = 'middle'
                    ctx.font = `bold ${tempFontSize}px Arial`
                    ctx.textAlign = 'left'
                    ctx.fillStyle = dim === 1 ? 'rgba(255,255,255,0.25)' : tempColours.number
                    ctx.fillText(numStr, tempLeft, tempRowY)
                    ctx.fillStyle = dim === 1 ? 'rgba(255,255,255,0.25)' : tempColours.unit
                    ctx.fillText(unitStr, tempLeft + numW, tempRowY)
                    ctx.restore()
                }
            }

            // ── Location — amber, centred ─────────────────────────────────────
            const toTitleCase = (str) => str
                ? str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                : null
            const locAddress = toTitleCase(locationSettings?.address) || null
            if (locAddress) {
                ctx.save()
                ctx.translate(cx, cy)
                ctx.font = `bold ${locFontSize}px Arial`
                ctx.fillStyle = dim === 1 ? 'rgba(255,200,0,0.25)' : '#FFC800'
                ctx.textBaseline = 'middle'
                ctx.textAlign = 'center'
                ctx.fillText(locAddress, 0, locY)
                ctx.restore()
            }

            // ── Below time: elapsed (amber) then countdown ────────────────────
            const elapsedY   = 124
            const countdownY = 243

            if (dim === 1) ctx.globalAlpha = 0.25
            sac.print(ctx, 'Elapsed ' + elapsed + ' · ' + nextVakit.name + ' in', 31, '#FFC800', elapsedY)
            sac.print(ctx, nextText, 187, white, countdownY)
            if (dim === 1) ctx.globalAlpha = 1
        }

        sac.updateTitle(ctx, 'AzanClock • ' + currentVakit.name + ' • Next: ' + nextVakit.name + ' @ ' + nextVakit.time + ' in ' + nextText + ' • ' + locationSettings.address)

        if (showAnalogue)
            sac.drawAnalogueClock(ctx);

    }, [canvasRef, hourAngle, vakits, arcVakits, displayTime, currentVakit, nextVakit, currentArcVakit, nextText, elapsed, midnightAngle, oneThirdAngle, twoThirdAngle, alarmSettings, naflAlarmSettings, isWeekDay, dim, deviceSettings, background, locationSettings, weatherData, currentHijriDay, moonImgRef, hourImgRef, minuteImgRef, profile, tick])

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
            ctx.save();
            ctx.translate(size / 2, size / 2);
            ctx.globalAlpha = dim === 1 ? 0.5 : (opacity || 1);
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
            const r = Math.min(width, height) * 0.45;
            const tip = [x - height, 0];
            const baseT = [x, -width];
            const baseB = [x, width];
            ctx.moveTo((tip[0] + baseT[0]) / 2, (tip[1] + baseT[1]) / 2);
            ctx.arcTo(tip[0], tip[1], (tip[0] + baseB[0]) / 2, (tip[1] + baseB[1]) / 2, r);
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

            const tickOuter = r
            const tickInner = r - 18
            const tickInnerSm = r - 10

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
            const outerR = 488
            const bandW = outerR - r
            const arcW = bandW / 2
            const midR = r + bandW / 2

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
        drawAnalogueClock: (ctx) => {
            const now = new Date();
            const hrs = now.getHours() % 12;
            const mins = now.getMinutes();
            const secs = now.getSeconds();

            const cx = size / 2;
            const cy = size / 2;
            const faceR = 370;

            const drawPngHand = (img, angle, imgW, imgH, pivotX, pivotY, targetTip) => {
                if (!img || !img.complete || img.naturalWidth === 0) return;
                const tipLen = imgW - pivotX;
                const scale = targetTip / tipLen;
                const dw = imgW * scale;
                const dh = imgH * scale;
                const dx = -pivotX * scale;
                const dy = -pivotY * scale;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(angle - Math.PI / 2);
                ctx.drawImage(img, dx, dy, dw, dh);
                ctx.restore();
            };

            // Hour hand
            const hourAng = ((hrs + mins / 60) / 12) * Math.PI * 2;
            drawPngHand(hourImgRef.current, hourAng, 857, 168, 165, 85, faceR * 1.16);

            // Minute hand
            const minAng = ((mins + secs / 60) / 60) * Math.PI * 2;
            drawPngHand(minuteImgRef.current, minAng, 857, 168, 165, 85, faceR * 1.16);

            // Second hand
            const secAng = (secs / 60) * Math.PI * 2 - Math.PI / 2;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(secAng);
            ctx.beginPath();
            ctx.moveTo(-faceR * 0.18, 0);
            ctx.lineTo(faceR * 1.1, 0);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.shadowColor = 'rgba(239,68,68,0.8)';
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.restore();

            // Centre pivot
            ctx.save();
            ctx.translate(cx, cy);
            ctx.beginPath();
            ctx.arc(0, 0, 11, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.shadowColor = 'rgba(0,0,0,0.9)';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#ef4444';
            ctx.shadowBlur = 0;
            ctx.fill();
            ctx.restore();

            return sac;
        },
    }

    return null
}
