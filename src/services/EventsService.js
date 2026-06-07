/**
 * EventsService.js
 *
 * Loads events from /events.csv AND /hijri_events.csv (both tab-separated)
 * and provides getActiveAndUpcoming(now, count, prayerTimes, timeZoneID).
 *
 * ── events.csv columns ───────────────────────────────────────────────────────
 *  Standard Gregorian events. time_start / time_end are "HH:MM" clock times.
 *
 * ── hijri_events.csv columns ─────────────────────────────────────────────────
 *  Islamic calendar events. Key differences:
 *    - salah_name  : prayer name whose Azan time is the event start
 *                    (Fajr | Sunrise | Dhuhr | Asr | Maghrib | Isha)
 *    - hijri_day_start / hijri_day_end : "DD/MM/YYYY" in the Hijri calendar
 *                    e.g. "01/01/1447" = 1st Muharram 1447
 *  The Islamic day begins at Maghrib (not midnight). An event dated the Nth
 *  of a Hijri month therefore starts at Maghrib of the *previous* Gregorian
 *  evening and ends at Maghrib of the Nth Gregorian day.
 *
 * ── Frequency rules (both files) ─────────────────────────────────────────────
 *  Daily   — repeats every day between day_start and day_end
 *  Weekly  — repeats on specific days; days field may contain:
 *              Mo Tu We Th Fr Sa Su  (individual days)
 *              Wk  (Mon–Fri)
 *              Wn  (Sat–Sun)
 *              Semicolon-separated combinations, e.g. "Mo;Tu;We"
 *  Monthly — days field may contain:
 *              1st 2nd 3rd 4th Lst  (nth week of month, day taken from day_start weekday)
 *              Day                  (same date each month as day_start)
 *  Annual  — repeats every year on the same day+month as day_start
 *              days field "Day" means same date; otherwise same logic
 */

// ── Parse helpers ─────────────────────────────────────────────────────────────

const DAY_ABBR_TO_JS = { Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, Su: 0 }
const WEEKDAYS = [1, 2, 3, 4, 5]   // Mon–Fri
const WEEKENDS = [6, 0]             // Sat–Sun

/** "DD/MM/YYYY" → Date at midnight local time (Gregorian) */
const parseDate = (str) => {
    if (!str) return null
    const [d, m, y] = str.trim().split('/')
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
}

/** "H:MM" or "HH:MM" → { hours, minutes } */
const parseTime = (str) => {
    if (!str) return { hours: 0, minutes: 0 }
    const [h, m] = str.trim().split(':').map(Number)
    return { hours: h || 0, minutes: m || 0 }
}

/** Apply { hours, minutes } to a Date, returning a new Date */
const applyTime = (date, timeStr) => {
    const d = new Date(date)
    const { hours, minutes } = parseTime(timeStr)
    d.setHours(hours, minutes, 0, 0)
    return d
}

/** Expand the days field into an array of JS weekday numbers (0=Sun…6=Sat) */
const expandDays = (daysStr) => {
    if (!daysStr) return []
    const parts = daysStr.split(';').map(s => s.trim())
    const result = new Set()
    for (const p of parts) {
        if (p === 'Wk') WEEKDAYS.forEach(d => result.add(d))
        else if (p === 'Wn') WEEKENDS.forEach(d => result.add(d))
        else if (DAY_ABBR_TO_JS[p] !== undefined) result.add(DAY_ABBR_TO_JS[p])
    }
    return [...result]
}

/**
 * Given a year+month and a week-position token (1st/2nd/3rd/4th/Lst)
 * and a target weekday (0–6), return the Date of that occurrence.
 */
const nthWeekdayOfMonth = (year, month, weekPos, targetWeekday) => {
    if (weekPos === 'Lst') {
        const last = new Date(year, month + 1, 0)
        while (last.getDay() !== targetWeekday) last.setDate(last.getDate() - 1)
        return last
    }
    const n = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4 }[weekPos]
    if (!n) return null
    const d = new Date(year, month, 1)
    let count = 0
    while (true) {
        if (d.getDay() === targetWeekday) {
            count++
            if (count === n) return new Date(d)
        }
        d.setDate(d.getDate() + 1)
        if (d.getMonth() !== month) return null
    }
}

// ── CSV loaders ───────────────────────────────────────────────────────────────

let _eventsCache = null
let _hijriEventsCache = null

const loadEvents = async () => {
    if (_eventsCache) return _eventsCache
    try {
        const res  = await fetch('/events.csv')
        const text = await res.text()
        const lines = text.trim().split('\n')
        const headers = lines[0].split('\t').map(s => s.trim())
        _eventsCache = lines.slice(1).map(line => {
            const cols = line.split('\t')
            const row = {}
            headers.forEach((h, i) => { row[h] = (cols[i] || '').trim() })
            return row
        }).filter(r => r.id && r.title)
    } catch (e) {
        _eventsCache = []
    }
    return _eventsCache
}

const loadHijriEvents = async () => {
    if (_hijriEventsCache) return _hijriEventsCache
    try {
        const res  = await fetch('/hijri_events.csv')
        const text = await res.text()
        const lines = text.trim().split('\n')
        const headers = lines[0].split('\t').map(s => s.trim())
        _hijriEventsCache = lines.slice(1).map(line => {
            const cols = line.split('\t')
            const row = {}
            headers.forEach((h, i) => { row[h] = (cols[i] || '').trim() })
            return row
        }).filter(r => r.id && r.title)
    } catch (e) {
        _hijriEventsCache = []
    }
    return _hijriEventsCache
}

// ── Hijri ↔ Gregorian conversion helpers ─────────────────────────────────────

/**
 * Convert a Hijri date (day, month, year — all 1-based) to a Gregorian Date
 * using the browser's Intl API with the islamic-umalqura calendar.
 *
 * Strategy: we know the Gregorian year is roughly (hijriYear - 1) * 0.97 + 622.
 * We search a ±2-year window around that estimate, checking each day's Hijri
 * representation until we find the match.  This is fast in practice because
 * Islamic months are only 29–30 days and the window is small.
 *
 * Results are cached permanently — the Hijri↔Gregorian mapping never changes,
 * so we only pay the search cost once per unique date for the lifetime of the page.
 *
 * Returns a Date at midnight local time, or null if not found.
 */
const _hijriToGregorianCache = new Map()

const hijriToGregorian = (hijriDay, hijriMonth, hijriYear) => {
    const cacheKey = `${hijriYear}/${hijriMonth}/${hijriDay}`
    if (_hijriToGregorianCache.has(cacheKey)) {
        return _hijriToGregorianCache.get(cacheKey)
    }

    // Rough Gregorian year estimate
    const estGregorianYear = Math.round(hijriYear * 0.9702 + 621.5)

    const fmt = new Intl.DateTimeFormat('en-SA-u-ca-islamic-umalqura', {
        day: 'numeric', month: 'numeric', year: 'numeric'
    })

    // Search ±2 Gregorian years around the estimate
    for (let gy = estGregorianYear - 2; gy <= estGregorianYear + 2; gy++) {
        // Islamic months are 29–30 days; scan the whole year
        for (let gm = 0; gm < 12; gm++) {
            for (let gd = 1; gd <= 31; gd++) {
                const candidate = new Date(gy, gm, gd)
                if (candidate.getMonth() !== gm) break // overflowed month

                const parts = fmt.formatToParts(candidate)
                const hd = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10)
                const hm = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10)
                const hy = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10)

                if (hd === hijriDay && hm === hijriMonth && hy === hijriYear) {
                    const result = new Date(gy, gm, gd)
                    _hijriToGregorianCache.set(cacheKey, result)
                    return result
                }
            }
        }
    }
    _hijriToGregorianCache.set(cacheKey, null)
    return null
}

/**
 * Map a salah name to a prayer time string "HH:MM" from the prayerTimes map.
 * prayerTimes is the object returned by PrayTimes.getTimes() — keys are
 * lowercase: fajr, sunrise, dhuhr, asr, maghrib, isha.
 * Returns null if the salah name is unrecognised or prayerTimes is unavailable.
 */
const salahNameToTime = (salahName, prayerTimes) => {
    if (!prayerTimes || !salahName) return null
    const key = salahName.trim().toLowerCase()
    // PrayTimes keys: imsak, fajr, sunrise, duha, dhuhr, asr, sunset, maghrib, isha, midnight
    const time = prayerTimes[key]
    return time || null
}

// ── Core occurrence finder (Gregorian events) ─────────────────────────────────

/**
 * Given a parsed Gregorian event row and a reference Date `now`,
 * return the next occurrence (or current if active) as:
 *   { start: Date, end: Date } or null if none found within the search window.
 */
const findNextOccurrence = (event, now, lookaheadDays = 60) => {
    const rangeStart = parseDate(event.day_start)
    const rangeEnd   = parseDate(event.day_end)
    if (!rangeStart || !rangeEnd) return null

    rangeEnd.setHours(23, 59, 59, 999)

    const freq = (event.frequency || '').trim()
    const daysField = (event.days || '').trim()

    const searchFrom = new Date(now)
    searchFrom.setDate(searchFrom.getDate() - 1)
    searchFrom.setHours(0, 0, 0, 0)

    const searchTo = new Date(now)
    searchTo.setDate(searchTo.getDate() + lookaheadDays)

    for (let d = new Date(searchFrom); d <= searchTo; d.setDate(d.getDate() + 1)) {
        if (d < rangeStart || d > rangeEnd) continue

        let matches = false

        if (freq === 'Daily') {
            matches = true

        } else if (freq === 'Weekly') {
            const allowedDays = expandDays(daysField)
            matches = allowedDays.includes(d.getDay())

        } else if (freq === 'Monthly') {
            const weekPositions = ['1st', '2nd', '3rd', '4th', 'Lst']
            if (daysField === 'Day') {
                matches = d.getDate() === rangeStart.getDate()
            } else if (weekPositions.includes(daysField)) {
                const targetWeekday = rangeStart.getDay()
                const candidate = nthWeekdayOfMonth(d.getFullYear(), d.getMonth(), daysField, targetWeekday)
                matches = candidate !== null &&
                    candidate.getDate()     === d.getDate() &&
                    candidate.getMonth()    === d.getMonth() &&
                    candidate.getFullYear() === d.getFullYear()
            } else {
                matches = d.getDate() === rangeStart.getDate()
            }

        } else if (freq === 'Annual') {
            matches = d.getDate()  === rangeStart.getDate() &&
                      d.getMonth() === rangeStart.getMonth()
        }

        if (!matches) continue

        const occStart = applyTime(d, event.time_start)
        const occEnd   = applyTime(d, event.time_end)

        if (occEnd <= occStart) occEnd.setDate(occEnd.getDate() + 1)

        if (occEnd > now) {
            return { start: occStart, end: occEnd }
        }
    }

    return null
}

// ── Core occurrence finder (Hijri events) ────────────────────────────────────

/**
 * Given a parsed Hijri event row, a reference Date `now`, and the current
 * prayer times map, return the next occurrence as { start: Date, end: Date }
 * or null.
 *
 * Islamic day semantics:
 *   The Nth of a Hijri month begins at Maghrib of the (N-1)th Gregorian day
 *   and ends at Maghrib of the Nth Gregorian day.
 *
 *   So for an event on 1 Muharram:
 *     - occStart = Maghrib on the Gregorian day *before* 1 Muharram
 *     - occEnd   = Maghrib on the Gregorian day of 1 Muharram
 *
 *   If salah_name is something other than Maghrib (e.g. Fajr), the event
 *   starts at that salah time on the Gregorian day of the Hijri date, and
 *   ends at the next Maghrib (end of that Islamic day).
 *
 * For Annual frequency the Hijri day+month repeats each Hijri year.
 * We search the next few Hijri years to find occurrences within the
 * lookahead window.
 */
const findNextHijriOccurrence = (event, now, prayerTimes, lookaheadDays = 400) => {
    if (!event.hijri_day_start || !event.hijri_day_end) return null

    const [hds_d, hds_m, hds_y] = event.hijri_day_start.trim().split('/').map(Number)
    const [hde_d, hde_m, hde_y] = event.hijri_day_end.trim().split('/').map(Number)

    if (!hds_d || !hds_m || !hds_y || !hde_d || !hde_m || !hde_y) return null

    const freq = (event.frequency || '').trim()
    const salahName = (event.salah_name || 'Maghrib').trim()

    // We need Maghrib time to determine Islamic day boundaries.
    // Fall back to '18:00' if prayer times are not yet available.
    const maghribTime = salahNameToTime('maghrib', prayerTimes) || '18:00'
    const eventSalahTime = salahNameToTime(salahName, prayerTimes) || maghribTime

    const searchTo = new Date(now)
    searchTo.setDate(searchTo.getDate() + lookaheadDays)

    // For Annual events we iterate over Hijri years; for non-Annual we check
    // the exact Hijri date range.
    const yearsToCheck = freq === 'Annual' ? 5 : 1

    for (let yearOffset = 0; yearOffset < yearsToCheck; yearOffset++) {
        // Determine the Hijri year(s) to check
        const checkHijriYear = hds_y + yearOffset

        // For Annual: same Hijri day+month each year
        // For others: use the exact hijri_day_start date
        const targetHijriDay   = hds_d
        const targetHijriMonth = hds_m
        const targetHijriYear  = checkHijriYear

        // Convert the Hijri date to its Gregorian equivalent
        const gregDate = hijriToGregorian(targetHijriDay, targetHijriMonth, targetHijriYear)
        if (!gregDate) continue

        // Check that this Gregorian date is within the event's Hijri range
        // For Annual: the range end year is hde_y; skip if we've passed it
        if (freq === 'Annual' && checkHijriYear > hde_y) break

        // The Islamic day for this Hijri date:
        //   starts at Maghrib of (gregDate - 1 day)
        //   ends   at Maghrib of (gregDate)
        const islamicDayStart = applyTime(
            new Date(gregDate.getTime() - 24 * 60 * 60 * 1000),
            maghribTime
        )
        const islamicDayEnd = applyTime(gregDate, maghribTime)

        // The event occurrence within this Islamic day:
        //   If salah is Maghrib → starts at islamicDayStart (Maghrib of prev evening)
        //   If salah is anything else (Fajr, Dhuhr, etc.) → starts at that salah
        //     time on the Gregorian day of the Hijri date
        let occStart, occEnd

        if (salahName.toLowerCase() === 'maghrib') {
            occStart = islamicDayStart
            occEnd   = islamicDayEnd
        } else {
            // Event starts at the named salah on the Gregorian day of the Hijri date
            occStart = applyTime(gregDate, eventSalahTime)
            // Event ends at Maghrib of the same Gregorian day (end of Islamic day)
            occEnd   = islamicDayEnd
            // If salah is after Maghrib (e.g. Isha), end at next Maghrib
            if (occStart >= occEnd) {
                occEnd = applyTime(
                    new Date(gregDate.getTime() + 24 * 60 * 60 * 1000),
                    maghribTime
                )
            }
        }

        // Skip if this occurrence has already fully ended
        if (occEnd <= now) continue

        // Skip if beyond our search window
        if (occStart > searchTo) continue

        return { start: occStart, end: occEnd }
    }

    return null
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns { active, upcoming } arrays, each sorted by occurrence start time.
 *
 * @param {Date}   now         — reference time (defaults to new Date())
 * @param {number} count       — max total events to return across both arrays
 * @param {object} prayerTimes — map from PrayTimes.getTimes() e.g. { maghrib: '18:32', fajr: '05:10', ... }
 *                               Pass null/undefined to skip Hijri events (they need prayer times to resolve salah times)
 */
const getActiveAndUpcoming = async (now = new Date(), count = 5, prayerTimes = null) => {
    const [events, hijriEvents] = await Promise.all([loadEvents(), loadHijriEvents()])
    const active   = []
    const upcoming = []

    // Process Gregorian events
    for (const event of events) {
        const occ = findNextOccurrence(event, now)
        if (!occ) continue

        const isActive = occ.start <= now && occ.end > now
        const minutesRemaining = isActive
            ? Math.ceil((occ.end - now) / 60000)
            : Math.ceil((occ.start - now) / 60000)

        const enriched = {
            ...event,
            nextOccurrence:   occ.start,
            occurrenceEnd:    occ.end,
            isActive,
            minutesRemaining,
            isHijriEvent: false,
        }

        if (isActive) active.push(enriched)
        else          upcoming.push(enriched)
    }

    // Process Hijri events (only when prayer times are available)
    if (prayerTimes) {
        for (const event of hijriEvents) {
            const occ = findNextHijriOccurrence(event, now, prayerTimes)
            if (!occ) continue

            const isActive = occ.start <= now && occ.end > now
            const minutesRemaining = isActive
                ? Math.ceil((occ.end - now) / 60000)
                : Math.ceil((occ.start - now) / 60000)

            const enriched = {
                ...event,
                // Expose time_start / time_end so EventsPanel can display them
                time_start: formatTimeHHMM(occ.start),
                time_end:   formatTimeHHMM(occ.end),
                nextOccurrence:   occ.start,
                occurrenceEnd:    occ.end,
                isActive,
                minutesRemaining,
                isHijriEvent: true,
            }

            if (isActive) active.push(enriched)
            else          upcoming.push(enriched)
        }
    }

    // Sort active by soonest ending first; upcoming by soonest starting first
    active.sort((a, b) => a.occurrenceEnd - b.occurrenceEnd)
    upcoming.sort((a, b) => a.nextOccurrence - b.nextOccurrence)

    const totalActive   = Math.min(active.length, count)
    const totalUpcoming = Math.min(upcoming.length, count - totalActive)

    return {
        active:   active.slice(0, totalActive),
        upcoming: upcoming.slice(0, totalUpcoming),
    }
}

/** Invalidate both caches (call if a CSV may have changed at runtime) */
const clearCache = () => {
    _eventsCache = null
    _hijriEventsCache = null
}

/** Format minutes into a human-readable string.
 *  > 24h  → "2d 3h 15m"  (days + hours + mins, zero parts omitted)
 *  ≤ 24h  → "3h 15m" / "45m"
 */
const formatMinutes = (mins) => {
    if (mins <= 0) return '0m'
    const m = mins % 60
    const totalHours = Math.floor(mins / 60)
    if (totalHours >= 24) {
        const d = Math.floor(totalHours / 24)
        const h = totalHours % 24
        if (h > 0 && m > 0) return `${d}d ${h}h ${m}m`
        if (h > 0)           return `${d}d ${h}h`
        if (m > 0)           return `${d}d ${m}m`
        return `${d}d`
    }
    if (totalHours > 0 && m > 0) return `${totalHours}h ${m}m`
    if (totalHours > 0)           return `${totalHours}h`
    return `${m}m`
}

/** Format a Date as "HH:MM" */
const formatTimeHHMM = (date) => {
    const h = String(date.getHours()).padStart(2, '0')
    const m = String(date.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
}

/**
 * Returns all upcoming (not yet active) events whose notification window is
 * currently open — i.e. the event starts within the next `NotifyMinutes` minutes.
 *
 * @param {Date}   now         — reference time (defaults to new Date())
 * @param {object} prayerTimes — prayer times map (needed for Hijri events)
 */
const getNotificationsDue = async (now = new Date(), prayerTimes = null) => {
    const [events, hijriEvents] = await Promise.all([loadEvents(), loadHijriEvents()])
    const due = []

    // Gregorian events
    for (const event of events) {
        const occ = findNextOccurrence(event, now)
        if (!occ) continue
        if (occ.start <= now) continue

        const minsUntilStart = (occ.start - now) / 60000
        const notifyMins = parseInt(event.NotifyMinutes, 10) || 0
        if (notifyMins > 0 && minsUntilStart <= notifyMins) {
            due.push({ ...event, nextOccurrence: occ.start, occurrenceEnd: occ.end, isHijriEvent: false })
        }
    }

    // Hijri events
    if (prayerTimes) {
        for (const event of hijriEvents) {
            const occ = findNextHijriOccurrence(event, now, prayerTimes)
            if (!occ) continue
            if (occ.start <= now) continue

            const minsUntilStart = (occ.start - now) / 60000
            const notifyMins = parseInt(event.NotifyMinutes, 10) || 0
            if (notifyMins > 0 && minsUntilStart <= notifyMins) {
                due.push({ ...event, nextOccurrence: occ.start, occurrenceEnd: occ.end, isHijriEvent: true })
            }
        }
    }

    return due
}

export const EventsService = {
    loadEvents,
    loadHijriEvents,
    getActiveAndUpcoming,
    getNotificationsDue,
    clearCache,
    formatMinutes,
}
