import { formatDate, daysUntil } from '../../lib/formatters'

export default function RoadmapTimeline({ milestones }) {
  if (!milestones?.length) return (
    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">無里程碑資料</p>
  )

  const sorted = [...milestones].sort((a, b) => a.planned_date?.localeCompare(b.planned_date))

  return (
    <div className="overflow-x-auto">
      {/* Scrollable rail */}
      <div className="relative min-w-max px-8 py-10">

        {/*
          Line position calculation:
          py-10 (40px) + h-14 label (56px) + gap-2 (8px) + half-dot (8px) = 112px = 7rem
        */}
        <div className="absolute top-[7rem] left-8 right-8 h-0.5 bg-gray-200 dark:bg-gray-700" />

        <div className="flex gap-16 relative">
          {sorted.map((m, i) => {
            const days    = daysUntil(m.planned_date)
            const overdue = !m.is_completed && days !== null && days < 0
            const dotColor = m.is_completed
              ? 'bg-green-500 border-green-500'
              : overdue
              ? 'bg-red-400 border-red-400'
              : 'bg-white dark:bg-gray-900 border-gray-400 dark:border-gray-500'

            const label = (
              <>
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight line-clamp-2">
                  {m.milestone_name}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {formatDate(m.planned_date)}
                  {m.actual_date && m.is_completed && (
                    <span className="ml-1 text-green-600 dark:text-green-400">
                      （實際 {formatDate(m.actual_date)}）
                    </span>
                  )}
                </p>
              </>
            )

            return (
              <div key={m.id} className="flex flex-col items-center gap-2 w-28">
                {/* 偶數索引：標籤在上；奇數索引：空白佔位 */}
                <div className="h-14 flex flex-col justify-end text-center">
                  {i % 2 === 0 && label}
                </div>

                {/* Dot */}
                <div className={`w-4 h-4 rounded-full border-2 z-10 shrink-0 flex items-center justify-center ${dotColor}`}>
                  {m.is_completed && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
                </div>

                {/* 奇數索引：標籤在下；偶數索引：空白佔位 */}
                <div className="h-14 flex flex-col justify-start text-center">
                  {i % 2 !== 0 && label}
                </div>

                {/* 狀態文字 */}
                <p className={`text-[10px] font-medium ${
                  m.is_completed ? 'text-green-600 dark:text-green-400' :
                  overdue        ? 'text-red-500 dark:text-red-400'
                                 : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {m.is_completed
                    ? '已完成'
                    : overdue
                    ? `逾期 ${Math.abs(days)}d`
                    : `${days}d 後`}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 圖例 */}
      <div className="flex gap-5 justify-center mt-1 pb-2 text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block shrink-0" />已完成
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block shrink-0" />逾期
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-400 dark:border-gray-500 inline-block shrink-0" />待達成
        </span>
      </div>
    </div>
  )
}
