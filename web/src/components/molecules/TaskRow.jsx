import { Link } from 'react-router-dom'
import StatusTag from '../atoms/StatusTag'
import { formatDate, daysUntil } from '../../lib/formatters'

export default function TaskRow({ task, detailPath }) {
  const days = daysUntil(task.deadline)
  const isBlocked = task.yaml_data?.blocked === true

  const cells = (
    <>
      <td className="py-2 px-3 text-xs text-gray-400 dark:text-gray-500 font-mono whitespace-nowrap">{task.external_id}</td>
      <td className="py-2 px-3 text-sm text-gray-800 dark:text-gray-200">
        {detailPath
          ? <Link to={detailPath} className="hover:text-blue-600 hover:underline">{task.title}</Link>
          : task.title}
      </td>
      <td className="py-2 px-3"><StatusTag status={isBlocked ? 'Blocked' : task.status} /></td>
      <td className="py-2 px-3 text-xs text-gray-500 dark:text-gray-400">{task.assignee_email ?? '—'}</td>
      <td className="py-2 px-3 text-xs whitespace-nowrap">
        {task.deadline ? (
          <span className={days !== null && days < 0 ? 'text-red-600 font-medium' : 'text-gray-500 dark:text-gray-400'}>
            {formatDate(task.deadline)}
            {days !== null && days < 0 && <span className="ml-1">({Math.abs(days)}d 逾期)</span>}
          </span>
        ) : '—'}
      </td>
    </>
  )

  return (
    <tr className={`border-b border-gray-100 dark:border-gray-800 ${isBlocked ? 'bg-red-50 dark:bg-red-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
      {cells}
    </tr>
  )
}
