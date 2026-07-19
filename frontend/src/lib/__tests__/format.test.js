import { describe, it, expect } from 'vitest'
import { formatDuration, formatDate } from '@/lib/format'

describe('formatDuration', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatDuration(null)).toBe('')
    expect(formatDuration(undefined)).toBe('')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration('PT1H30M')).toBe('1h 30m')
  })

  it('formats hours only', () => {
    expect(formatDuration('PT2H')).toBe('2h')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration('PT5M30S')).toBe('5m 30s')
  })

  it('formats minutes only', () => {
    expect(formatDuration('PT45M')).toBe('45m')
  })

  it('formats seconds only', () => {
    expect(formatDuration('PT30S')).toBe('30s')
  })

  it('returns raw string for non-ISO format', () => {
    expect(formatDuration('invalid')).toBe('invalid')
  })

  it('handles zero duration', () => {
    expect(formatDuration('PT0S')).toBe('0s')
  })
})

describe('formatDate', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
  })

  it('formats ISO date string', () => {
    const result = formatDate('2025-03-15T00:00:00Z')
    expect(result).toContain('Mar')
    expect(result).toContain('15')
    expect(result).toContain('2025')
  })
})
