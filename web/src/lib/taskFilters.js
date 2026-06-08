/**
 * @param {Array<{status: string, deadline: string|null}>} tasks
 * @param {string} [todayStr]  YYYY-MM-DD, defaults to today
 * @returns {Array}
 */
export function filterOverdueTasks(tasks, todayStr = new Date().toISOString().slice(0, 10)) {
  if (!tasks) return []
  return tasks.filter(t =>
    t.status !== 'Done' &&
    t.deadline &&
    t.deadline < todayStr
  )
}

/**
 * @param {Array<{yaml_data: object|null}>} tasks
 * @returns {Array}
 */
export function filterBlockedTasks(tasks) {
  if (!tasks) return []
  return tasks.filter(t => t.yaml_data?.blocked === true)
}
