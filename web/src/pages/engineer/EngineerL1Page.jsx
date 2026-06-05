import { Link } from 'react-router-dom'
import Navbar from '../../components/organisms/Navbar'
import StatusTag from '../../components/atoms/StatusTag'
import { SkeletonCard } from '../../components/atoms/Skeleton'
import ErrorMessage from '../../components/atoms/ErrorMessage'
import { useAllMyTasks } from '../../hooks/useAllMyTasks'
import { filterBlockedTasks, filterOverdueTasks } from '../../lib/taskFilters'

export default function EngineerL1Page() {
  const { data: tasks, isLoading, error } = useAllMyTasks()

  const blocked  = filterBlockedTasks(tasks)
  const overdue  = filterOverdueTasks(tasks)
  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">工程師儀表板</h1>

        {error    && <ErrorMessage message={error.message} />}
        {isLoading && <><SkeletonCard /><SkeletonCard /></>}

        {!isLoading && !error && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-xs text-gray-400 dark:text-gray-500">待辦任務</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{tasks?.length ?? 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-xs text-gray-400 dark:text-gray-500">卡關任務</p>
                <p className={`text-2xl font-bold mt-1 ${blocked.length ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
                  {blocked.length}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-xs text-gray-400 dark:text-gray-500">逾期任務</p>
                <p className={`text-2xl font-bold mt-1 ${overdue.length ? 'text-yellow-600' : 'text-gray-900 dark:text-gray-100'}`}>
                  {overdue.length}
                </p>
              </div>
            </div>

            {!tasks?.length ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                <p className="text-4xl mb-3">🎉</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">今日無待辦任務，太棒了！</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">所有任務皆已完成或尚未指派</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3 w-1/2">任務</th>
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">專案</th>
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">截止日</th>
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">狀態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {tasks.map(task => {
                      const isOverdue = task.status !== 'Done' && task.deadline && task.deadline < todayStr
                      return (
                        <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                          <td className="px-4 py-3">
                            <Link
                              to={`/engineer/${task.project_id}/tasks/${task.id}`}
                              className="font-medium text-gray-800 dark:text-gray-200 hover:text-blue-600 hover:underline block"
                            >
                              {task.title}
                            </Link>
                            {task.external_id && (
                              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{task.external_id}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              to={`/engineer/${task.project_id}`}
                              className="text-blue-600 hover:underline text-xs font-medium"
                            >
                              {task.projects?.name ?? '—'}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            {task.deadline ? (
                              <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                                {isOverdue && '⚠ '}{task.deadline}
                              </span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <StatusTag status={task.status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
