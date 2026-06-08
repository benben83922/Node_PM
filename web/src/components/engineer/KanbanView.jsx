import { Link } from 'react-router-dom'
import PriorityTag from '../atoms/PriorityTag'
import { formatDate } from '../../lib/formatters'

const COLUMNS = [
  { key: 'Todo',    label: '待辦' },
  { key: 'Doing',   label: '進行中' },
  { key: 'Done',    label: '完成' },
  { key: 'Blocked', label: '卡關' },
]

const COL_STYLE = {
  Todo:    'border-t-2 border-gray-300 dark:border-gray-600',
  Doing:   'border-t-2 border-blue-400',
  Done:    'border-t-2 border-green-400',
  Blocked: 'border-t-2 border-red-400',
}

function taskStatus(t) {
  if (t.yaml_data?.blocked) return 'Blocked'
  return t.status
}

export default function KanbanView({ tasks, basePath }) {
  if (!tasks?.length) return <p className="text-sm text-gray-400 dark:text-gray-500">無任務資料</p>

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => taskStatus(t) === col.key)
        return (
          <div key={col.key} className={`bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2 ${COL_STYLE[col.key]}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{col.label}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{colTasks.length}</span>
            </div>
            {colTasks.map(t => {
              const priority = t.yaml_data?.priority ?? null
              const card = (
                <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-2 space-y-1 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-2">{t.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{t.external_id}</span>
                    {t.deadline && <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatDate(t.deadline)}</span>}
                  </div>
                  {priority && (
                    <div><PriorityTag priority={priority} /></div>
                  )}
                </div>
              )
              return basePath
                ? <Link key={t.id} to={`${basePath}/tasks/${t.id}`}>{card}</Link>
                : <div key={t.id}>{card}</div>
            })}
          </div>
        )
      })}
    </div>
  )
}
