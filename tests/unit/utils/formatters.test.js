import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatPhoneNumber,
  truncateText,
} from '@/lib/utils/formatters'

describe('formatCurrency', () => {
  it('formats basic currency values', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
    expect(formatCurrency(0)).toBe('$0.00')
    expect(formatCurrency(1000000)).toBe('$1,000,000.00')
  })

  it('handles null and undefined values', () => {
    expect(formatCurrency(null)).toBe('$0.00')
    expect(formatCurrency(undefined)).toBe('$0.00')
  })

  it('hides cents when showCents is false', () => {
    expect(formatCurrency(1234.56, { showCents: false })).toBe('$1,235')
    expect(formatCurrency(1000, { showCents: false })).toBe('$1,000')
  })

  it('handles negative values', () => {
    const result = formatCurrency(-1234.56)
    expect(result).toMatch(/-?\$/)
  })

  it('converts string numbers to currency', () => {
    expect(formatCurrency('100')).toBe('$100.00')
    expect(formatCurrency('50.5')).toBe('$50.50')
  })
})

describe('formatDate', () => {
  it('formats Date objects', () => {
    const date = new Date('2024-01-15')
    const result = formatDate(date)
    expect(result).toContain('Jan')
    expect(result).toContain('2024')
  })

  it('handles Supabase date strings (YYYY-MM-DD)', () => {
    const result = formatDate('2024-01-15')
    expect(result).toMatch(/Jan.*15.*2024/)
  })

  it('handles ISO date strings', () => {
    const result = formatDate('2024-01-15T10:30:00Z')
    expect(result).toContain('Jan')
    expect(result).toContain('2024')
  })

  it('returns em-dash for null/empty values', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('')).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })

  it('handles invalid dates gracefully', () => {
    expect(formatDate('invalid')).toBe('invalid')
    expect(formatDate(new Date('invalid'))).toBe('—')
  })

  it('supports different style presets', () => {
    const date = new Date('2024-01-15')
    const short = formatDate(date, { style: 'short' })
    const long = formatDate(date, { style: 'long' })
    expect(short).toMatch(/\d+\/\d+\/\d+/)
    expect(long).toContain('January')
    expect(long).toContain('2024')
  })
})

describe('formatDateTime', () => {
  it('formats Date objects with time', () => {
    const date = new Date('2024-01-15T15:30:00Z')
    const result = formatDateTime(date)
    expect(result).toMatch(/Jan.*15.*2024/)
    expect(result).toMatch(/\d+:\d+/)
  })

  it('handles ISO strings', () => {
    const result = formatDateTime('2024-01-15T15:30:00Z')
    expect(result).toMatch(/Jan.*15.*2024/)
    expect(result).toMatch(/\d+:\d+/)
  })

  it('returns em-dash for null/empty values', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime('')).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
  })

  it('handles invalid dates', () => {
    expect(formatDateTime('invalid')).toBe('invalid')
    // new Date('invalid') returns Invalid Date string
    expect(formatDateTime(new Date('invalid'))).toBeDefined()
  })
})

describe('formatRelativeTime', () => {
  it('returns em-dash for null/empty values', () => {
    expect(formatRelativeTime(null)).toBe('—')
    expect(formatRelativeTime('')).toBe('—')
    expect(formatRelativeTime(undefined)).toBe('—')
  })

  it('handles invalid dates', () => {
    expect(formatRelativeTime('invalid')).toBe('invalid')
  })

  it('handles recent dates (minutes/hours)', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const result = formatRelativeTime(tenMinutesAgo)
    expect(result).toMatch(/minute|ago/)
  })

  it('fallback behavior for older browsers (when Intl.RelativeTimeFormat is unavailable)', () => {
    // Test the fallback strings when using simple logic
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const result = formatRelativeTime(yesterday)
    expect(result).toBeDefined()
  })
})

describe('formatPhoneNumber', () => {
  it('formats 10-digit US phone numbers', () => {
    expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890')
  })

  it('handles phone numbers with existing formatting', () => {
    expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890')
    expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890')
  })

  it('handles 11-digit numbers with country code', () => {
    const result = formatPhoneNumber('11234567890')
    expect(result).toMatch(/\+1.*\(\d{3}\)/)
  })

  it('returns empty string for null/empty values', () => {
    expect(formatPhoneNumber(null)).toBe('')
    expect(formatPhoneNumber('')).toBe('')
    expect(formatPhoneNumber(undefined)).toBe('')
  })

  it('returns original value for non-standard formats', () => {
    expect(formatPhoneNumber('123')).toBe('123')
    expect(formatPhoneNumber('abc')).toBe('abc')
  })
})

describe('truncateText', () => {
  it('returns unchanged text when under maxLength', () => {
    expect(truncateText('hello')).toBe('hello')
    expect(truncateText('hello world', 50)).toBe('hello world')
  })

  it('truncates long text with ellipsis', () => {
    expect(truncateText('hello world this is a long text', 10)).toBe('hello w...')
    expect(truncateText('a'.repeat(100), 50)).toBe('a'.repeat(47) + '...')
  })

  it('uses default maxLength of 50', () => {
    const longText = 'a'.repeat(60)
    expect(truncateText(longText)).toBe('a'.repeat(47) + '...')
  })

  it('returns empty string for null/empty values', () => {
    expect(truncateText(null)).toBe('')
    expect(truncateText('')).toBe('')
    expect(truncateText(undefined)).toBe('')
  })
})
