import { describe, it, expect } from 'vitest'
import { calcHealth } from './healthCalc'

const TODAY = new Date('2026-06-05')

describe('calcHealth', () => {
  it('TC-HC-001: empty tasks returns normal', () => {
    expect(calcHealth([], TODAY)).toBe('normal')
  })

  it('TC-HC-002: null returns normal', () => {
    expect(calcHealth(null, TODAY)).toBe('normal')
  })

  it('TC-HC-003: blocked task returns critical', () => {
    const tasks = [{ status: 'Todo', deadline: null, yaml_data: { blocked: true } }]
    expect(calcHealth(tasks, TODAY)).toBe('critical')
  })

  it('TC-HC-004: overdue undone task returns warning', () => {
    const tasks = [{ status: 'Todo', deadline: '2026-06-01', yaml_data: null }]
    expect(calcHealth(tasks, TODAY)).toBe('warning')
  })

  it('TC-HC-005: overdue but Done task returns normal', () => {
    const tasks = [{ status: 'Done', deadline: '2026-06-01', yaml_data: null }]
    expect(calcHealth(tasks, TODAY)).toBe('normal')
  })

  it('TC-HC-006: blocked takes priority over overdue (returns critical)', () => {
    const tasks = [
      { status: 'Todo', deadline: '2026-06-01', yaml_data: { blocked: true } },
    ]
    expect(calcHealth(tasks, TODAY)).toBe('critical')
  })

  it('TC-HC-007: all tasks on-time and unblocked returns normal', () => {
    const tasks = [
      { status: 'Todo', deadline: '2026-06-30', yaml_data: null },
      { status: 'Done', deadline: '2026-06-01', yaml_data: null },
    ]
    expect(calcHealth(tasks, TODAY)).toBe('normal')
  })
})
