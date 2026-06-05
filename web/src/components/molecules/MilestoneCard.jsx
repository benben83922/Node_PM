import { formatDate, daysUntil } from '../../lib/formatters'

export default function MilestoneCard({ milestone }) {
  const days = daysUntil(milestone.planned_date)

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      milestone.is_completed
        ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
    }`}>
      <span className={`text-lg ${milestone.is_completed ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`}>
        {milestone.is_completed ? '✓' : '○'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{milestone.milestone_name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(milestone.planned_date)}</p>
      </div>
      {!milestone.is_completed && days !== null && (
        <span className={`text-xs font-medium ${days < 0 ? 'text-red-600' : days <= 7 ? 'text-yellow-600' : 'text-gray-500 dark:text-gray-400'}`}>
          {days < 0 ? `${Math.abs(days)}d 逾期` : `${days}d 後`}
        </span>
      )}
    </div>
  )
}
