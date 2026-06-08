import { describe, it, expect } from 'vitest'
import { calcProgress } from './progressCalc'

describe('calcProgress', () => {
  it('TC-PC-001: empty array returns 0', () => {
    expect(calcProgress([])).toBe(0)
  })

  it('TC-PC-002: null returns 0', () => {
    expect(calcProgress(null)).toBe(0)
  })

  it('TC-PC-003: all Done returns 100', () => {
    const tasks = [{ status: 'Done' }, { status: 'Done' }]
    expect(calcProgress(tasks)).toBe(100)
  })

  it('TC-PC-004: no Done returns 0', () => {
    const tasks = [{ status: 'Todo' }, { status: 'Todo' }]
    expect(calcProgress(tasks)).toBe(0)
  })

  it('TC-PC-005: mixed rounds correctly', () => {
    const tasks = [
      { status: 'Done' },
      { status: 'Done' },
      { status: 'Todo' },
    ]
    expect(calcProgress(tasks)).toBe(67)
  })

  it('TC-PC-006: single Done task returns 100', () => {
    expect(calcProgress([{ status: 'Done' }])).toBe(100)
  })
})
