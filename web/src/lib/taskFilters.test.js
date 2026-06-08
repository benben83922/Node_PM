import { describe, it, expect } from 'vitest'
import { filterOverdueTasks, filterBlockedTasks } from './taskFilters'

describe('filterOverdueTasks', () => {
  it('TC-TF-001: returns empty for null', () => {
    expect(filterOverdueTasks(null)).toHaveLength(0)
  })

  it('TC-TF-002: filters out done tasks even if overdue', () => {
    const tasks = [{ status: 'Done', deadline: '2026-01-01' }]
    expect(filterOverdueTasks(tasks, '2026-06-05')).toHaveLength(0)
  })
})

describe('filterBlockedTasks', () => {
  it('TC-TF-003: returns blocked tasks only', () => {
    const tasks = [
      { yaml_data: { blocked: true } },
      { yaml_data: null },
      { yaml_data: { blocked: false } },
    ]
    expect(filterBlockedTasks(tasks)).toHaveLength(1)
  })

  it('TC-TF-004: returns empty for null', () => {
    expect(filterBlockedTasks(null)).toHaveLength(0)
  })
})
