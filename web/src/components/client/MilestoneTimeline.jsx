import { formatDate, daysUntil } from '../../lib/formatters'

export default function MilestoneTimeline({ milestones }) {
  if (!milestones?.length) return (
    <p className="text-sm text-gray-400 dark:text-gray-500">無里程碑資料</p>
  )

  const sorted = [...milestones].sort((a, b) => a.planned_date.localeCompare(b.planned_date))

  return (
    <ol className="relative border-l border-gray-200 dark:border-gray-700 space-y-5 ml-3">
      {sorted.map(m => {
        const days   = daysUntil(m.planned_date)
        const overdue = !m.is_completed && days !== null && days < 0
        return (
          <li key={m.id} className="ml-4">
            <span className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${
              m.is_completed ? 'bg-green-500' : overdue ? 'bg-red-400' : 'bg-gray-300 dark:bg-gray-600'
            }`} />
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{m.milestone_name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(m.planned_date)}</p>
            {m.is_completed && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">已完成 ✓</p>
            )}
            {!m.is_completed && days !== null && (
              <p className={`text-xs mt-0.5 ${overdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                {overdue ? `已逾期 ${Math.abs(days)} 天` : `${days} 天後`}
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
