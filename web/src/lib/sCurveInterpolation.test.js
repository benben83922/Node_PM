import { describe, it, expect } from 'vitest'
import { interpolatePlannedRate } from './sCurveInterpolation'

const milestones = [
  { planned_date: '2026-06-10' },
  { planned_date: '2026-06-20' },
  { planned_date: '2026-06-30' },
  { planned_date: '2026-07-10' },
]

describe('interpolatePlannedRate', () => {
  it('TC-SC-001: before first milestone returns 0', () => {
    expect(interpolatePlannedRate(milestones, '2026-06-01')).toBe(0)
  })

  it('TC-SC-002: after last milestone returns 100', () => {
    expect(interpolatePlannedRate(milestones, '2026-07-15')).toBe(100)
  })

  it('TC-SC-003: at first milestone returns stepPct (25)', () => {
    expect(interpolatePlannedRate(milestones, '2026-06-10')).toBe(25)
  })

  it('TC-SC-004: midpoint between milestones interpolates correctly', () => {
    // Between M1 (25%) and M2 (50%), halfway = 37 or 38
    const result = interpolatePlannedRate(milestones, '2026-06-15')
    expect(result).toBeGreaterThanOrEqual(37)
    expect(result).toBeLessThanOrEqual(38)
  })
})
