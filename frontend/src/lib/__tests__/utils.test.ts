/**
 * Unit tests for utility functions
 */
import { describe, it, expect } from 'vitest'
import { cn, formatTimebank } from '../utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('class1', 'class2')).toContain('class1')
    expect(cn('class1', 'class2')).toContain('class2')
  })

  it('handles conditional classes', () => {
    const result = cn('class1', false && 'class2', 'class3')
    expect(result).toContain('class1')
    expect(result).toContain('class3')
    expect(result).not.toContain('class2')
  })

  it('handles undefined and null', () => {
    const result = cn('class1', undefined, null, 'class2')
    expect(result).toContain('class1')
    expect(result).toContain('class2')
  })
})

describe('formatTimebank', () => {
  it('formats numbers for display', () => {
    expect(formatTimebank(1.0)).toBe('1')
    expect(formatTimebank(2.5)).toBe('2.5')
    expect(formatTimebank(10.99)).toBe('10.99')
  })

  it('formats strings for display', () => {
    expect(formatTimebank('1.0')).toBe('1')
    expect(formatTimebank('2.5')).toBe('2.5')
    expect(formatTimebank('10.99')).toBe('10.99')
  })

  it('handles undefined and null', () => {
    expect(formatTimebank(undefined)).toBe('0')
    expect(formatTimebank(null)).toBe('0')
  })

  it('handles invalid values', () => {
    expect(formatTimebank('invalid')).toBe('0')
    expect(formatTimebank(NaN)).toBe('0')
  })
})
