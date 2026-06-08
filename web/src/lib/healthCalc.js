/**
 * @typedef {'normal'|'warning'|'critical'} HealthStatus
 */

/**
 * Calculate project health based on tasks.
 * - critical: any Blocked task
 * - warning:  any overdue task (deadline < today AND status != Done)
 * - normal:   otherwise
 *
 * @param {Array<{status: string, deadline: string|null, yaml_data: object|null}>} tasks
 * @param {Date} [today]
 * @returns {HealthStatus}
 */
export function calcHealth(tasks, today = new Date()) {
  if (!tasks || tasks.length === 0) return 'normal'

  const todayStr = today.toISOString().slice(0, 10)

  const hasBlocked = tasks.some(t => t.yaml_data?.blocked === true)
  if (hasBlocked) return 'critical'

  const hasOverdue = tasks.some(t =>
    t.status !== 'Done' &&
    t.deadline &&
    t.deadline < todayStr
  )
  return hasOverdue ? 'warning' : 'normal'
}

export const HEALTH_LABEL = {
  normal:   '正常',
  warning:  '注意',
  critical: '異常',
}

export const HEALTH_COLOR = {
  normal:   'text-health-normal',
  warning:  'text-health-warning',
  critical: 'text-health-critical',
}
