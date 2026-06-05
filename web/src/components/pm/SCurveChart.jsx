import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { interpolatePlannedRate } from '../../lib/sCurveInterpolation'
import { formatDate } from '../../lib/formatters'

function buildChartData(milestones, tasks) {
  if (!milestones?.length) return []

  const sorted = [...milestones].sort((a, b) => a.planned_date.localeCompare(b.planned_date))
  const start  = sorted[0].planned_date

  // Extend end date to cover any task deadline that falls after the last milestone
  const lastMilestoneDate = sorted[sorted.length - 1].planned_date
  const taskDeadlines = tasks?.map(t => t.deadline).filter(Boolean) ?? []
  const end = taskDeadlines.reduce((max, d) => (d > max ? d : max), lastMilestoneDate)

  const doneTasks = tasks?.filter(t => t.status === 'Done') ?? []
  // Null-deadline Done tasks have no date to filter on — count them at every point
  const nullDeadlineDoneCount = doneTasks.filter(t => !t.deadline).length

  const points = []
  let d = new Date(start)
  const endDate = new Date(end)

  while (d <= endDate) {
    const dateStr = d.toISOString().slice(0, 10)
    const planned = interpolatePlannedRate(milestones, dateStr)
    const actual  = tasks?.length
      ? Math.round(
          (doneTasks.filter(t => t.deadline && t.deadline <= dateStr).length + nullDeadlineDoneCount)
          / tasks.length * 100
        )
      : null

    points.push({ date: formatDate(dateStr), planned, actual })
    d.setDate(d.getDate() + 1)
  }

  return points
}

export default function SCurveChart({ milestones, tasks }) {
  const data = buildChartData(milestones, tasks)

  if (!data.length) return <p className="text-sm text-gray-400">無里程碑資料</p>

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} width={38} />
        <Tooltip formatter={(v) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="planned" name="計畫進度" stroke="#94a3b8" dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="actual"  name="實際進度" stroke="#3b82f6" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
