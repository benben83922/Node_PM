import { useNavigate } from 'react-router-dom'
import StatusTag from '../atoms/StatusTag'
import Spinner from '../atoms/Spinner'
import ErrorMessage from '../atoms/ErrorMessage'
import { formatDate, daysUntil } from '../../lib/formatters'

export default function TaskDetail({ task, isLoading, error }) {
  const navigate = useNavigate()

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  if (error)     return <ErrorMessage message={error.message} />
  if (!task)     return null

  const days      = daysUntil(task.deadline)
  const isBlocked = task.yaml_data?.blocked === true
  const status    = isBlocked ? 'Blocked' : task.status

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1"
      >
        ← 返回
      </button>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mb-1">{task.external_id}</p>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{task.title}</h2>
          </div>
          <StatusTag status={status} />
        </div>

        <hr className="border-gray-100 dark:border-gray-800" />

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">負責人</dt>
            <dd className="text-sm text-gray-800 dark:text-gray-200">{task.assignee_email ?? '—'}</dd>
          </div>

          <div>
            <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">截止日</dt>
            <dd className={`text-sm font-medium ${days !== null && days < 0 ? 'text-red-600' : 'text-gray-800 dark:text-gray-200'}`}>
              {task.deadline ? formatDate(task.deadline) : '—'}
              {days !== null && days < 0 && (
                <span className="ml-2 text-xs font-normal">（逾期 {Math.abs(days)} 天）</span>
              )}
              {days !== null && days >= 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">（{days} 天後）</span>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">WBS 路徑</dt>
            <dd className="text-sm text-gray-600 dark:text-gray-400 font-mono">{task.wbs_path ?? '—'}</dd>
          </div>

          <div>
            <dt className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">負責角色</dt>
            <dd className="text-sm text-gray-800 dark:text-gray-200">{task.assignee_role ?? '—'}</dd>
          </div>

          {isBlocked && task.yaml_data?.reason && (
            <div className="sm:col-span-2 bg-red-50 dark:bg-red-950/30 rounded-lg p-3 border border-red-100 dark:border-red-900/50">
              <dt className="text-xs text-red-500 dark:text-red-400 mb-1 font-medium">卡關原因</dt>
              <dd className="text-sm text-red-700 dark:text-red-300 flex items-start gap-1.5">
                <span className="flex-shrink-0">🔒</span>
                <span>{task.yaml_data.reason}</span>
              </dd>
            </div>
          )}
        </dl>

        {task.yaml_data && Object.keys(task.yaml_data).length > 0 && (
          <div>
            <dt className="text-xs text-gray-400 dark:text-gray-500 mb-1">附加屬性（yaml_data）</dt>
            <pre className="text-xs bg-gray-50 dark:bg-gray-800 rounded-lg p-3 overflow-x-auto text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
              {JSON.stringify(task.yaml_data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
