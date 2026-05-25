import { describe, it, expect } from 'vitest'
import {
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  getWeekDays,
  getMonthDays,
  isSameDay,
  isSameMonth,
  formatTime,
  formatMonthYear,
  formatWeekRange,
  startOfDay,
  toLocalISODate,
  DAY_NAMES,
} from '@/lib/utils/dateHelpers'

describe('addDays', () => {
  it('adds positive days to a date', () => {
    const date = new Date(2024, 0, 15) // Jan 15, 2024
    const result = addDays(date, 5)
    expect(result.getDate()).toBe(20)
    expect(result.getMonth()).toBe(0)
  })

  it('subtracts days when given negative number', () => {
    const date = new Date(2024, 0, 15)
    const result = addDays(date, -5)
    expect(result.getDate()).toBe(10)
  })

  it('handles month rollover when adding days', () => {
    const date = new Date(2024, 0, 28) // Jan 28
    const result = addDays(date, 5)
    expect(result.getDate()).toBe(2)
    expect(result.getMonth()).toBe(1) // February
  })

  it('handles year rollover when adding days', () => {
    const date = new Date(2024, 11, 28) // Dec 28
    const result = addDays(date, 5)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(0) // January
    expect(result.getDate()).toBe(2)
  })

  it('does not mutate original date', () => {
    const date = new Date('2024-01-15')
    const originalDate = date.getDate()
    addDays(date, 5)
    expect(date.getDate()).toBe(originalDate)
  })
})

describe('addWeeks', () => {
  it('adds weeks (7-day increments)', () => {
    const date = new Date(2024, 0, 15)
    const result = addWeeks(date, 2)
    expect(result.getDate()).toBe(29)
  })

  it('subtracts weeks with negative number', () => {
    const date = new Date(2024, 0, 15)
    const result = addWeeks(date, -2)
    expect(result.getDate()).toBe(1)
  })

  it('handles month rollover', () => {
    const date = new Date(2024, 0, 28)
    const result = addWeeks(date, 1)
    expect(result.getMonth()).toBe(1) // February
  })
})

describe('addMonths', () => {
  it('adds months to a date', () => {
    const date = new Date(2024, 0, 15) // Jan 15
    const result = addMonths(date, 3)
    expect(result.getMonth()).toBe(3) // April
    expect(result.getDate()).toBe(15)
  })

  it('subtracts months with negative number', () => {
    const date = new Date(2024, 2, 15) // Mar 15
    const result = addMonths(date, -2)
    expect(result.getMonth()).toBe(0) // January
  })

  it('handles year rollover', () => {
    const date = new Date(2024, 10, 15) // Nov 15
    const result = addMonths(date, 3)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(1) // February
  })

  it('overflows day when target month has fewer days', () => {
    const date = new Date(2024, 0, 31) // Jan 31
    const result = addMonths(date, 1)
    // February 2024 only has 29 days, so Jan 31 + 1 month = Mar 2
    expect(result.getMonth()).toBe(2) // March
    expect(result.getDate()).toBe(2)
  })

  it('does not mutate original date', () => {
    const date = new Date('2024-01-15')
    const originalMonth = date.getMonth()
    addMonths(date, 3)
    expect(date.getMonth()).toBe(originalMonth)
  })
})

describe('startOfWeek', () => {
  it('returns Monday at midnight for a Monday input', () => {
    const monday = new Date(2024, 0, 15) // Jan 15, 2024 is a Monday
    const result = startOfWeek(monday)
    expect(result.getDate()).toBe(15)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
  })

  it('returns Monday for any day in the same week', () => {
    const wednesday = new Date(2024, 0, 17) // Jan 17 is Wednesday
    const result = startOfWeek(wednesday)
    expect(result.getDate()).toBe(15) // Monday
  })

  it('returns Monday for Sunday (same week)', () => {
    const sunday = new Date(2024, 0, 21) // Jan 21 is Sunday
    const result = startOfWeek(sunday)
    expect(result.getDate()).toBe(15) // Monday of that week
  })

  it('handles month boundaries', () => {
    const date = new Date(2024, 1, 2) // Feb 2, 2024 is Friday
    const result = startOfWeek(date)
    // Monday should be Jan 29
    expect(result.getMonth()).toBe(0) // January
    expect(result.getDate()).toBe(29)
  })

  it('sets time to midnight', () => {
    const date = new Date(2024, 0, 17, 14, 30, 45)
    const result = startOfWeek(date)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })
})

describe('getWeekDays', () => {
  it('returns 7 Date objects', () => {
    const date = new Date(2024, 0, 15)
    const result = getWeekDays(date)
    expect(result).toHaveLength(7)
    expect(result.every(d => d instanceof Date)).toBe(true)
  })

  it('returns consecutive days from Monday to Sunday', () => {
    const date = new Date(2024, 0, 15) // Jan 15 is Monday
    const result = getWeekDays(date)
    expect(result[0].getDate()).toBe(15) // Monday
    expect(result[1].getDate()).toBe(16) // Tuesday
    expect(result[6].getDate()).toBe(21) // Sunday
  })

  it('returns same week regardless of input day', () => {
    const monday = new Date(2024, 0, 15)
    const wednesday = new Date(2024, 0, 17)
    const sunday = new Date(2024, 0, 21)

    const resultMon = getWeekDays(monday)
    const resultWed = getWeekDays(wednesday)
    const resultSun = getWeekDays(sunday)

    expect(resultMon[0].getDate()).toBe(resultWed[0].getDate())
    expect(resultWed[0].getDate()).toBe(resultSun[0].getDate())
  })

  it('handles month boundaries', () => {
    const date = new Date(2024, 1, 2) // Feb 2 is Friday
    const result = getWeekDays(date)
    // Week should span Jan 29 - Feb 4
    expect(result[0].getMonth()).toBe(0) // Jan 29
    expect(result[5].getMonth()).toBe(1) // Feb 3
    expect(result[6].getMonth()).toBe(1) // Feb 4
  })
})

describe('getMonthDays', () => {
  it('returns 42 days (6x7 grid)', () => {
    const date = new Date(2024, 0, 15)
    const result = getMonthDays(date)
    expect(result).toHaveLength(42)
  })

  it('starts with previous month days to fill to Monday', () => {
    const date = new Date(2024, 0, 15) // Jan 2024
    const result = getMonthDays(date)
    // Jan 1, 2024 is a Monday, so first day should be Jan 1
    expect(result[0].getDate()).toBe(1)
    expect(result[0].getMonth()).toBe(0)
  })

  it('includes all days of the target month', () => {
    const date = new Date(2024, 0, 15)
    const result = getMonthDays(date)
    // January has 31 days
    const januaryDays = result.filter(d => d.getMonth() === 0 && d.getDate() <= 31)
    expect(januaryDays.length).toBe(31)
  })

  it('fills remainder with next month days', () => {
    const date = new Date(2024, 0, 15)
    const result = getMonthDays(date)
    // Last few days should be from February
    const februaryDays = result.filter(d => d.getMonth() === 1)
    expect(februaryDays.length).toBeGreaterThan(0)
  })

  it('handles February in leap year', () => {
    const date = new Date(2024, 1, 15) // 2024 is leap year
    const result = getMonthDays(date)
    const februaryDays = result.filter(d => d.getMonth() === 1)
    expect(februaryDays.length).toBe(29)
  })

  it('handles February in non-leap year', () => {
    const date = new Date(2023, 1, 15) // 2023 is not leap year
    const result = getMonthDays(date)
    const februaryDays = result.filter(d => d.getMonth() === 1)
    expect(februaryDays.length).toBe(28)
  })

  it('handles month that starts on different days of week', () => {
    // Test month starting on different days
    const april2024 = new Date(2024, 3, 15)
    const may2024 = new Date(2024, 4, 15)
    const june2024 = new Date(2024, 5, 15)

    expect(getMonthDays(april2024)).toHaveLength(42)
    expect(getMonthDays(may2024)).toHaveLength(42)
    expect(getMonthDays(june2024)).toHaveLength(42)
  })
})

describe('isSameDay', () => {
  it('returns true for same date', () => {
    const date1 = new Date(2024, 0, 15)
    const date2 = new Date(2024, 0, 15)
    expect(isSameDay(date1, date2)).toBe(true)
  })

  it('returns true for same date with different times', () => {
    const date1 = new Date(2024, 0, 15, 9, 0, 0)
    const date2 = new Date(2024, 0, 15, 18, 30, 0)
    expect(isSameDay(date1, date2)).toBe(true)
  })

  it('returns false for different dates', () => {
    const date1 = new Date(2024, 0, 15)
    const date2 = new Date(2024, 0, 16)
    expect(isSameDay(date1, date2)).toBe(false)
  })

  it('returns false for different months', () => {
    const date1 = new Date(2024, 0, 15)
    const date2 = new Date(2024, 1, 15)
    expect(isSameDay(date1, date2)).toBe(false)
  })

  it('returns false for different years', () => {
    const date1 = new Date(2024, 0, 15)
    const date2 = new Date(2025, 0, 15)
    expect(isSameDay(date1, date2)).toBe(false)
  })
})

describe('isSameMonth', () => {
  it('returns true for same month and year', () => {
    const date1 = new Date(2024, 0, 15)
    const date2 = new Date(2024, 0, 28)
    expect(isSameMonth(date1, date2)).toBe(true)
  })

  it('returns true regardless of day and time', () => {
    const date1 = new Date(2024, 0, 1, 0, 0, 0)
    const date2 = new Date(2024, 0, 31, 23, 59, 59)
    expect(isSameMonth(date1, date2)).toBe(true)
  })

  it('returns false for different months', () => {
    const date1 = new Date(2024, 0, 15)
    const date2 = new Date(2024, 1, 15)
    expect(isSameMonth(date1, date2)).toBe(false)
  })

  it('returns false for different years', () => {
    const date1 = new Date(2024, 0, 15)
    const date2 = new Date(2025, 0, 15)
    expect(isSameMonth(date1, date2)).toBe(false)
  })
})

describe('formatTime', () => {
  it('formats time as "9:00 AM"', () => {
    const date = new Date(2024, 0, 15, 9, 0, 0)
    const result = formatTime(date)
    expect(result).toMatch(/9:00\s*AM/)
  })

  it('formats afternoon times as PM', () => {
    const date = new Date(2024, 0, 15, 15, 30, 0)
    const result = formatTime(date)
    expect(result).toMatch(/3:30\s*PM/)
  })

  it('formats midnight', () => {
    const date = new Date(2024, 0, 15, 0, 0, 0)
    const result = formatTime(date)
    expect(result).toMatch(/12:00\s*AM/)
  })

  it('formats noon', () => {
    const date = new Date(2024, 0, 15, 12, 0, 0)
    const result = formatTime(date)
    expect(result).toMatch(/12:00\s*PM/)
  })

  it('pads minutes with leading zero', () => {
    const date = new Date(2024, 0, 15, 9, 5, 0)
    const result = formatTime(date)
    expect(result).toMatch(/9:05\s*AM/)
  })
})

describe('formatMonthYear', () => {
  it('formats as "March 2026"', () => {
    const date = new Date(2026, 2, 15)
    const result = formatMonthYear(date)
    expect(result).toBe('March 2026')
  })

  it('formats January correctly', () => {
    const date = new Date(2024, 0, 15)
    const result = formatMonthYear(date)
    expect(result).toBe('January 2024')
  })

  it('formats December correctly', () => {
    const date = new Date(2024, 11, 15)
    const result = formatMonthYear(date)
    expect(result).toBe('December 2024')
  })

  it('uses full month names', () => {
    const date = new Date(2024, 1, 15)
    const result = formatMonthYear(date)
    expect(result).toBe('February 2024')
  })
})

describe('formatWeekRange', () => {
  it('formats week range correctly', () => {
    // Jan 15, 2024 is a Monday
    const monday = new Date(2024, 0, 15)
    const result = formatWeekRange(monday)
    expect(result).toMatch(/Jan 15\s*–\s*Jan 21, 2024/)
  })

  it('spans 7 days from Monday to Sunday', () => {
    const monday = new Date(2024, 0, 15)
    const result = formatWeekRange(monday)
    // Should format as "Jan 15 – Jan 21, 2024"
    expect(result).toContain('Jan')
    expect(result).toContain('2024')
  })

  it('handles month boundaries', () => {
    // Jan 29, 2024 is a Monday
    const monday = new Date(2024, 0, 29)
    const result = formatWeekRange(monday)
    // Week is Jan 29 - Feb 4
    expect(result).toMatch(/Jan 29\s*–\s*Feb 4, 2024/)
  })

  it('handles year boundaries', () => {
    // Dec 25, 2023 is a Monday
    const monday = new Date(2023, 11, 25)
    const result = formatWeekRange(monday)
    // Week is Dec 25, 2023 - Dec 31, 2023
    expect(result).toMatch(/Dec 25\s*–\s*Dec 31, 2023/)
  })
})

describe('startOfDay', () => {
  it('sets time to midnight (00:00:00.000)', () => {
    const date = new Date(2024, 0, 15, 14, 30, 45, 123)
    const result = startOfDay(date)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  it('preserves date components', () => {
    const date = new Date(2024, 0, 15, 14, 30, 45)
    const result = startOfDay(date)
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(15)
  })

  it('does not mutate original date', () => {
    const date = new Date(2024, 0, 15, 14, 30, 45)
    const originalHours = date.getHours()
    startOfDay(date)
    expect(date.getHours()).toBe(originalHours)
  })

  it('handles already-midnight dates', () => {
    const date = new Date(2024, 0, 15, 0, 0, 0)
    const result = startOfDay(date)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })
})

describe('toLocalISODate', () => {
  it('formats as "YYYY-MM-DD"', () => {
    const date = new Date(2024, 0, 15)
    const result = toLocalISODate(date)
    expect(result).toBe('2024-01-15')
  })

  it('pads single-digit month and day', () => {
    const date = new Date(2024, 1, 5) // Feb 5
    const result = toLocalISODate(date)
    expect(result).toBe('2024-02-05')
  })

  it('handles December', () => {
    const date = new Date(2024, 11, 25) // Dec 25
    const result = toLocalISODate(date)
    expect(result).toBe('2024-12-25')
  })

  it('handles year boundaries', () => {
    const date = new Date(2025, 0, 1) // Jan 1, 2025
    const result = toLocalISODate(date)
    expect(result).toBe('2025-01-01')
  })

  it('uses local timezone', () => {
    // The function specifically converts to local time
    const date = new Date(2024, 5, 15, 15, 30, 0) // June 15
    const result = toLocalISODate(date)
    expect(result).toBe('2024-06-15')
  })
})

describe('DAY_NAMES', () => {
  it('is an array of 7 day names', () => {
    expect(DAY_NAMES).toHaveLength(7)
    expect(Array.isArray(DAY_NAMES)).toBe(true)
  })

  it('starts with Monday and ends with Sunday', () => {
    expect(DAY_NAMES[0]).toBe('Mon')
    expect(DAY_NAMES[6]).toBe('Sun')
  })

  it('contains correct abbreviated day names', () => {
    expect(DAY_NAMES).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  })
})
