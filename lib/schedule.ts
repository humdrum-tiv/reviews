import type { ReviewType, Settings } from '@/types'

/**
 * Returns the ISO date string "YYYY-MM-DD" for a Date object.
 */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Parse "YYYY-MM-DD" to a local Date (midnight).
 */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Returns the next non-rest-day date on or after `date`.
 * If there's no rest day, returns `date` unchanged.
 */
function nextNonRestDay(date: Date, restDay: number | null): Date {
  if (restDay === null) return date
  const d = new Date(date)
  while (d.getDay() === restDay) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

/**
 * Returns the scheduled date for a weekly review given a reference date.
 * The weekly review happens on `weeklyReviewDay` (0=Sun) of the current
 * or upcoming week. If that day is a rest day, shift forward.
 */
function getWeeklyReviewDate(referenceDate: Date, settings: Settings): Date {
  const { weeklyReviewDay, restDay } = settings
  const dow = referenceDate.getDay()
  let daysUntil = weeklyReviewDay - dow
  if (daysUntil < 0) daysUntil += 7

  const candidate = new Date(referenceDate)
  candidate.setDate(candidate.getDate() + daysUntil)
  return nextNonRestDay(candidate, restDay)
}

/**
 * Returns the scheduled date for a monthly review (first non-rest day of the month).
 */
function getMonthlyReviewDate(year: number, month: number, restDay: number | null): Date {
  const candidate = new Date(year, month, 1) // month is 0-indexed
  return nextNonRestDay(candidate, restDay)
}

/**
 * Returns the scheduled date for a quarterly review.
 * Quarters start in Jan(0), Apr(3), Jul(6), Oct(9).
 */
function getQuarterlyReviewDate(year: number, quarter: number, restDay: number | null): Date {
  const startMonth = quarter * 3 // 0, 3, 6, 9
  const candidate = new Date(year, startMonth, 1)
  return nextNonRestDay(candidate, restDay)
}

/**
 * Returns the scheduled date for the annual review (first non-rest day of the year).
 */
function getAnnualReviewDate(year: number, restDay: number | null): Date {
  const candidate = new Date(year, 0, 1)
  return nextNonRestDay(candidate, restDay)
}

/**
 * Determines what review types are due on `dateStr` given settings and
 * which reviews have already been completed (set of "type-YYYY-MM-DD" ids).
 *
 * Priority: annual > quarterly > monthly > weekly > [morning, evening]
 * If any major review (weekly+) is scheduled today, morning/evening are suppressed
 * (regardless of whether the major review is completed).
 * If it's a rest day, nothing is due.
 */
export function getReviewsDueToday(
  dateStr: string,
  settings: Settings,
  completedIds: Set<string>
): ReviewType[] {
  const date = parseDate(dateStr)
  const { restDay } = settings

  // Rest day → nothing
  if (restDay !== null && date.getDay() === restDay) return []

  const y = date.getFullYear()
  const m = date.getMonth() // 0-indexed
  const q = Math.floor(m / 3)

  const annualDate = toISODate(getAnnualReviewDate(y, restDay))
  const quarterlyDate = toISODate(getQuarterlyReviewDate(y, q, restDay))
  const monthlyDate = toISODate(getMonthlyReviewDate(y, m, restDay))

  // Weekly: find the weekly review day that covers this week
  // The "week" here means: going back from dateStr to find if today IS the weekly day
  const weeklyDate = toISODate(getWeeklyReviewDate(date, settings))

  const due: ReviewType[] = []

  // Check which type of day this is, and add if not yet completed
  if (annualDate === dateStr) {
    if (!completedIds.has(`annual-${dateStr}`)) due.push('annual')
  } else if (quarterlyDate === dateStr) {
    if (!completedIds.has(`quarterly-${dateStr}`)) due.push('quarterly')
  } else if (monthlyDate === dateStr) {
    if (!completedIds.has(`monthly-${dateStr}`)) due.push('monthly')
  } else if (weeklyDate === dateStr) {
    if (!completedIds.has(`weekly-${dateStr}`)) due.push('weekly')
  } else {
    // Regular day: morning + evening (only if NOT a major review day)
    if (!completedIds.has(`morning-${dateStr}`)) due.push('morning')
    if (!completedIds.has(`evening-${dateStr}`)) due.push('evening')
  }

  return due
}

/**
 * Returns all review types that COULD appear on a given day
 * (used for display/preview purposes, ignoring completion state).
 */
export function getScheduledReviewType(dateStr: string, settings: Settings): ReviewType | 'morning+evening' | 'rest' | null {
  const date = parseDate(dateStr)
  const { restDay } = settings

  if (restDay !== null && date.getDay() === restDay) return 'rest'

  const y = date.getFullYear()
  const m = date.getMonth()
  const q = Math.floor(m / 3)

  if (toISODate(getAnnualReviewDate(y, restDay)) === dateStr) return 'annual'
  if (toISODate(getQuarterlyReviewDate(y, q, restDay)) === dateStr) return 'quarterly'
  if (toISODate(getMonthlyReviewDate(y, m, restDay)) === dateStr) return 'monthly'
  if (toISODate(getWeeklyReviewDate(date, settings)) === dateStr) return 'weekly'
  return 'morning+evening'
}

/**
 * Returns the date range a given review "covers" — used for history context panel.
 */
export function getReviewPeriod(type: ReviewType, dateStr: string): { start: string; end: string } {
  const date = parseDate(dateStr)
  const y = date.getFullYear()
  const m = date.getMonth()
  const q = Math.floor(m / 3)

  switch (type) {
    case 'morning':
    case 'evening':
      return { start: dateStr, end: dateStr }
    case 'weekly': {
      const end = new Date(date)
      const start = new Date(date)
      start.setDate(start.getDate() - 6)
      return { start: toISODate(start), end: toISODate(end) }
    }
    case 'monthly':
      return {
        start: toISODate(new Date(y, m, 1)),
        end: toISODate(new Date(y, m + 1, 0)),
      }
    case 'quarterly':
      return {
        start: toISODate(new Date(y, q * 3, 1)),
        end: toISODate(new Date(y, q * 3 + 3, 0)),
      }
    case 'annual':
      return {
        start: toISODate(new Date(y, 0, 1)),
        end: toISODate(new Date(y, 11, 31)),
      }
  }
}

/**
 * Returns which sub-review types to show in the history panel for a given review.
 */
export function getHistoryContext(type: ReviewType): ReviewType[] {
  switch (type) {
    case 'morning': return ['morning']
    case 'evening': return ['evening']
    case 'weekly': return ['weekly', 'morning', 'evening']
    case 'monthly': return ['monthly', 'weekly', 'morning', 'evening']
    case 'quarterly': return ['quarterly', 'monthly', 'weekly', 'morning', 'evening']
    case 'annual': return ['annual', 'quarterly', 'monthly', 'weekly']
  }
}

/**
 * Format a date string for display: "March 20, 2026"
 */
export function formatDateLong(dateStr: string): string {
  const date = parseDate(dateStr)
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/**
 * Format a date string short: "Mar 20"
 */
export function formatDateShort(dateStr: string): string {
  const date = parseDate(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
