import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = { Done: '#22c55e', Todo: '#e5e7eb' }

export default function CompletionDonut({ tasks }) {
  const done  = tasks?.filter(t => t.status === 'Done').length ?? 0
  const total = tasks?.length ?? 0
  const todo  = total - done

  const data = [
    { name: '完成', value: done },
    { name: '未完成', value: todo },
  ]

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={35} outerRadius={55} startAngle={90} endAngle={-270} strokeWidth={0}>
            {data.map(entry => (
              <Cell key={entry.name} fill={COLORS[entry.name === '完成' ? 'Done' : 'Todo']} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => `${v} 項`} />
        </PieChart>
      </ResponsiveContainer>

      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-900">{total ? Math.round((done / total) * 100) : 0}%</p>
        <p className="text-xs text-gray-400">完成 {done} / {total} 項</p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />完成
          <span className="inline-block h-2 w-2 rounded-full bg-gray-200 ml-2" />待辦
        </div>
      </div>
    </div>
  )
}
