/**
 * Calculate completion percentage from a task array.
 * @param {Array<{status: string}>} tasks
 * @returns {number} 0–100 (integer)
 */
export function calcProgress(tasks) {
  if (!tasks || tasks.length === 0) return 0
  const done = tasks.filter(t => t.status === 'Done').length
  return Math.round((done / tasks.length) * 100)
}
