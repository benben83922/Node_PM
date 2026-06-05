import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatDate } from '../../lib/formatters'

function buildBurndown(tasks) {
  if (!tasks?.length) return []

  const total = tasks.length
  const deadlines = tasks
    .filter(t => t.deadline && t.status === 'Done')
    .map(t => t.deadline)
    .sort()

  if (!deadlines.length) return []

  const start = deadlines[0]
  const end   = deadlines[deadlines.length - 1]

  const points = []
  let d = new Date(start)
  const endDate = new Date(end)

  while (d <= endDate) {
    const ds = d.toISOString().slice(0, 10)
    const done = tasks.filter(t => t.status === 'Done' && t.deadline && t.deadline <= ds).length
    points.push({ date: formatDate(ds), remaining: total - done })
    d.setDate(d.getDate() + 1)
  }

  return points
}

export default function SprintBurndownChart({ tasks }) {
  const data = buildBurndown(tasks)

  if (!data.length) return <p className="text-sm text-gray-400">無足夠資料產生燃盡圖</p>

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id="burnGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11 }} width={30} />
        <Tooltip />
        <Area type="monotone" dataKey="remaining" name="剩餘任務" stroke="#3b82f6" fill="url(#burnGradient)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
