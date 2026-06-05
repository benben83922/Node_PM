import { filterBlockedTasks } from '../../lib/taskFilters'
import StatusTag from '../atoms/StatusTag'

export default function BlockerList({ tasks }) {
  const blocked = filterBlockedTasks(tasks)

  if (!blocked.length) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">目前沒有卡關任務 🎉</p>
  }

  return (
    <ul className="space-y-2">
      {blocked.map(t => (
        <li key={t.id} className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-100 dark:border-red-900/50">
          <StatusTag status="Blocked" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{t.title}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t.external_id} · {t.assignee_email ?? '未指派'}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
