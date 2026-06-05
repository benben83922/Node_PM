import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const STATUS_COLOR = {
  Todo:    '#94a3b8',
  Doing:   '#60a5fa',
  Done:    '#34d399',
  Blocked: '#f87171',
}

export default function CfdChart({ tasks }) {
  if (!tasks?.length) return <p className="text-sm text-gray-400">無任務資料</p>

  const counts = ['Todo', 'Doing', 'Done', 'Blocked'].map(s => ({
    status: s,
    count: tasks.filter(t => {
      if (s === 'Blocked') return t.yaml_data?.blocked === true
      if (s === 'Todo')    return t.status === 'Todo' && !t.yaml_data?.blocked
      return t.status === s
    }).length,
  }))

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={counts} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="status" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => [`${v} 個`, '任務數']} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {counts.map(c => (
              <Cell key={c.status} fill={STATUS_COLOR[c.status]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 text-center">
        當前快照｜歷史趨勢資料累積中，完整 CFD 待多日資料後自動啟用
      </p>
    </div>
  )
}
