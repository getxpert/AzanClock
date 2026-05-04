/**
 * EventsService.js
 *
 * Loads events from /events.csv (tab-separated) and provides
 * getActiveAndUpcoming(now, count) which returns:
 *   { active: [...], upcoming: [...] }
 *
 * Each returned event object is the original parsed row plus:
 *   - nextOccurrence : Date  — the start of the next/current occurrence
 *   - occurrenceEnd  : Date  — the end of that occurrence
 *   - isActive       : bool  — true if now falls within the occurrence window
 *   - minutesRemaining : number — minutes until occurrence ends (active) or starts (upcoming)
 *
 * ── Frequency rules ──────────────────────────────────────────────────────────
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

/** "DD/MM/YYYY" → Date at midnight local time */
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

/** Total minutes since midnight for a Date */
const toMins = (date) => date.getHours() * 60 + date.getMinutes()

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
        // Last occurrence: start from last day of month and go backwards
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
        if (d.getMonth() !== month) return null // not enough occurrences
    }
}

// ── CSV loader ────────────────────────────────────────────────────────────────

let _eventsCache = null

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

// ── Core occurrence finder ────────────────────────────────────────────────────

/**
 * Given a parsed event row and a reference Date `now`,
 * return the next occurrence (or current if active) as:
 *   { start: Date, end: Date } or null if none found within the search window.
 *
 * Searches up to `lookaheadDays` days ahead.
 */
const findNextOccurrence = (event, now, lookaheadDays = 60) => {
    const rangeStart = parseDate(event.day_start)
    const rangeEnd   = parseDate(event.day_end)
    if (!rangeStart || !rangeEnd) return null

    // Set rangeEnd to end-of-day so events on the last day are included
    rangeEnd.setHours(23, 59, 59, 999)

    const freq = (event.frequency || '').trim()
    const daysField = (event.days || '').trim()

    // We search day by day from (now - 1 day) to catch currently active events
    const searchFrom = new Date(now)
    searchFrom.setDate(searchFrom.getDate() - 1)
    searchFrom.setHours(0, 0, 0, 0)

    const searchTo = new Date(now)
    searchTo.setDate(searchTo.getDate() + lookaheadDays)

    for (let d = new Date(searchFrom); d <= searchTo; d.setDate(d.getDate() + 1)) {
        // Must be within the event's active date range
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
                // Same date each month as day_start
                matches = d.getDate() === rangeStart.getDate()
            } else if (weekPositions.includes(daysField)) {
                // nth weekday of month — weekday taken from day_start
                const targetWeekday = rangeStart.getDay()
                const candidate = nthWeekdayOfMonth(d.getFullYear(), d.getMonth(), daysField, targetWeekday)
                matches = candidate !== null &&
                    candidate.getDate()     === d.getDate() &&
                    candidate.getMonth()    === d.getMonth() &&
                    candidate.getFullYear() === d.getFullYear()
            } else {
                // Fallback: treat like "Day"
                matches = d.getDate() === rangeStart.getDate()
            }

        } else if (freq === 'Annual') {
            // Same day+month every year
            matches = d.getDate()  === rangeStart.getDate() &&
                      d.getMonth() === rangeStart.getMonth()

        }

        if (!matches) continue

        const occStart = applyTime(d, event.time_start)
        const occEnd   = applyTime(d, event.time_end)

        // Handle overnight events (end < start → end is next day)
        if (occEnd <= occStart) occEnd.setDate(occEnd.getDate() + 1)

        // Only return if the occurrence hasn't fully ended yet
        if (occEnd > now) {
            return { start: occStart, end: occEnd }
        }
    }

    return null
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns { active, upcoming } arrays, each sorted by occurrence start time.
 *
 * @param {Date}   now    — reference time (defaults to new Date())
 * @param {number} count  — max total events to return across both arrays
 */
const getActiveAndUpcoming = async (now = new Date(), count = 5) => {
    const events = await loadEvents()
    const active   = []
    const upcoming = []

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
        }

        if (isActive) active.push(enriched)
        else          upcoming.push(enriched)
    }

    // Sort active by soonest ending first; upcoming by soonest starting first
    active.sort((a, b) => a.occurrenceEnd - b.occurrenceEnd)
    upcoming.sort((a, b) => a.nextOccurrence - b.nextOccurrence)

    // Trim to requested count
    const totalActive   = Math.min(active.length, count)
    const totalUpcoming = Math.min(upcoming.length, count - totalActive)

    return {
        active:   active.slice(0, totalActive),
        upcoming: upcoming.slice(0, totalUpcoming),
    }
}

/** Invalidate the cache (call if the CSV may have changed at runtime) */
const clearCache = () => { _eventsCache = null }

/** Format minutes into a human-readable string: "2h 15m" or "45m" */
const formatMinutes = (mins) => {
    if (mins <= 0) return '0m'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0)           return `${h}h`
    return `${m}m`
}

/**
 * Returns all upcoming (not yet active) events whose notification window is
 * currently open — i.e. the event starts within the next `NotifyMinutes` minutes.
 *
 * @param {Date} now — reference time (defaults to new Date())
 */
const getNotificationsDue = async (now = new Date()) => {
    const events = await loadEvents()
    const due = []

    for (const event of events) {
        const occ = findNextOccurrence(event, now)
        if (!occ) continue

        // Only upcoming events (not already active)
        if (occ.start <= now) continue

        const minsUntilStart = (occ.start - now) / 60000
        const notifyMins = parseInt(event.NotifyMinutes, 10) || 0
        if (notifyMins > 0 && minsUntilStart <= notifyMins) {
            due.push({ ...event, nextOccurrence: occ.start, occurrenceEnd: occ.end })
        }
    }

    return due
}

export const EventsService = { loadEvents, getActiveAndUpcoming, getNotificationsDue, clearCache, formatMinutes }
