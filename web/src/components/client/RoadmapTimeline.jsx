import { formatDate, daysUntil } from '../../lib/formatters'

export default function RoadmapTimeline({ milestones }) {
  if (!milestones?.length) return <p className="text-sm text-gray-400 text-center py-8">無里程碑資料</p>

  const sorted = [...milestones].sort((a, b) => a.planned_date?.localeCompare(b.planned_date))

  return (
    <div className="overflow-x-auto pb-4">
      {/* Horizontal rail */}
      <div className="relative min-w-max px-8 py-10">
        {/* Line */}
        <div className="absolute top-[4.25rem] left-8 right-8 h-0.5 bg-gray-200" />

        {/* Milestone nodes */}
        <div className="flex gap-16 relative">
          {sorted.map((m, i) => {
            const days     = daysUntil(m.planned_date)
            const overdue  = !m.is_completed && days !== null && days < 0
            const dotColor = m.is_completed ? 'bg-green-500 border-green-500'
                           : overdue        ? 'bg-red-400 border-red-400'
                           :                  'bg-white border-gray-400'

            return (
              <div key={m.id} className="flex flex-col items-center gap-2 w-28">
                {/* Label above (odd) */}
                {i % 2 === 0 && (
                  <div className="text-center h-14 flex flex-col justify-end">
                    <p className="text-xs font-medium text-gray-800 leading-tight line-clamp-2">{m.milestone_name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(m.planned_date)}</p>
                  </div>
                )}
                {i % 2 !== 0 && <div className="h-14" />}

                {/* Dot */}
                <div className={`w-4 h-4 rounded-full border-2 z-10 flex items-center justify-center ${dotColor}`}>
                  {m.is_completed && <span className="text-white text-[8px] font-bold">✓</span>}
                </div>

                {/* Label below (even) */}
                {i % 2 !== 0 && (
                  <div className="text-center h-14 flex flex-col justify-start">
                    <p className="text-xs font-medium text-gray-800 leading-tight line-clamp-2">{m.milestone_name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(m.planned_date)}</p>
                  </div>
                )}
                {i % 2 === 0 && <div className="h-14" />}

                {/* Status text */}
                <p className={`text-[10px] font-medium ${
                  m.is_completed ? 'text-green-600' :
                  overdue        ? 'text-red-500'   : 'text-gray-400'
                }`}>
                  {m.is_completed ? '已完成'
                   : overdue      ? `逾期 ${Math.abs(days)}d`
                   :                `${days}d 後`}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />已完成</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />逾期</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-gray-400 inline-block" />待達成</span>
      </div>
    </div>
  )
}
