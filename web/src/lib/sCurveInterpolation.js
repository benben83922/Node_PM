/**
 * Calculate planned completion rate via linear interpolation between milestones.
 *
 * @param {Array<{planned_date: string, is_completed?: boolean}>} milestones
 *   Sorted ascending by planned_date. Each milestone represents 1/n of total work.
 * @param {string} targetDate  YYYY-MM-DD
 * @returns {number} 0–100 planned rate at targetDate
 */
export function interpolatePlannedRate(milestones, targetDate) {
  if (!milestones || milestones.length === 0) return 0

  const sorted = [...milestones]
    .filter(m => m.planned_date)
    .sort((a, b) => a.planned_date.localeCompare(b.planned_date))

  if (sorted.length === 0) return 0

  const n = sorted.length
  // Each milestone represents an equal fraction of total planned work
  const stepPct = 100 / n

  if (targetDate < sorted[0].planned_date) return 0
  if (targetDate >= sorted[n - 1].planned_date) return 100

  // Find the two milestones surrounding targetDate
  for (let i = 0; i < n - 1; i++) {
    const from = sorted[i]
    const to   = sorted[i + 1]

    if (targetDate >= from.planned_date && targetDate <= to.planned_date) {
      const fromPct = stepPct * (i + 1)
      const toPct   = stepPct * (i + 2)

      const totalMs = dateDiffDays(from.planned_date, to.planned_date)
      if (totalMs === 0) return toPct

      const elapsedMs = dateDiffDays(from.planned_date, targetDate)
      const ratio = elapsedMs / totalMs

      return Math.round(fromPct + (toPct - fromPct) * ratio)
    }
  }

  return 100
}

function dateDiffDays(dateStrA, dateStrB) {
  return (new Date(dateStrB) - new Date(dateStrA)) / 86_400_000
}
