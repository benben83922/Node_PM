/**
 * Format YYYY-MM-DD to locale display string.
 * @param {string|null} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${y}/${m}/${d}`
}

/**
 * @param {number} value  0–100
 * @returns {string}  e.g. "75%"
 */
export function formatPercent(value) {
  if (value == null || isNaN(value)) return '—'
  return `${Math.round(value)}%`
}

/**
 * Days until (or since) a given date from today.
 * @param {string} dateStr  YYYY-MM-DD
 * @returns {number}  negative = overdue
 */
export function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = (new Date(dateStr) - new Date()) / 86_400_000
  return Math.ceil(diff)
}

/**
 * Format ISO timestamp to locale date-time string.
 * @param {string|null} isoStr
 * @returns {string}
 */
export function formatDateTime(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Returns freshness category based on how old an ISO timestamp is.
 * @param {string|null} isoStr
 * @returns {'fresh'|'warning'|'stale'|'unknown'}
 */
export function syncFreshness(isoStr) {
  if (!isoStr) return 'unknown'
  const ageMs = Date.now() - new Date(isoStr).getTime()
  if (ageMs < 2 * 3_600_000)  return 'fresh'
  if (ageMs < 24 * 3_600_000) return 'warning'
  return 'stale'
}
