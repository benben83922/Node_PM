import { Link } from 'react-router-dom'
import Navbar from '../../components/organisms/Navbar'
import StatusTag from '../../components/atoms/StatusTag'
import PriorityTag from '../../components/atoms/PriorityTag'
import { SkeletonCard } from '../../components/atoms/Skeleton'
import ErrorMessage from '../../components/atoms/ErrorMessage'
import { useAllMyTasks } from '../../hooks/useAllMyTasks'
import { filterBlockedTasks } from '../../lib/taskFilters'
import { daysUntil } from '../../lib/formatters'

function DeadlineCell({ deadline }) {
  if (!deadline) return <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
  const days = daysUntil(deadline)
  if (days === null) return <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
  if (days < 0)  return <span className="text-red-600 font-semibold text-xs">逾期 {Math.abs(days)} 天</span>
  if (days === 0) return <span className="text-red-600 font-bold text-xs">今天到期！</span>
  if (days === 1) return <span className="text-orange-500 font-medium text-xs">明天 (1d)</span>
  if (days <= 7)  return <span className="text-yellow-600 dark:text-yellow-400 text-xs">{days} 天後</span>
  return <span className="text-gray-500 dark:text-gray-400 text-xs">{days} 天後</span>
}

function TableHead() {
  return (
    <thead>
      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3 w-1/2">任務</th>
        <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">專案</th>
        <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">截止日</th>
        <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">優先度</th>
        <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-4 py-3">狀態</th>
      </tr>
    </thead>
  )
}

function NormalRow({ task }) {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
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
        <Link to={`/engineer/${task.project_id}`} className="text-blue-600 hover:underline text-xs font-medium">
          {task.projects?.name ?? '—'}
        </Link>
      </td>
      <td className="px-4 py-3"><DeadlineCell deadline={task.deadline} /></td>
      <td className="px-4 py-3"><PriorityTag priority={task.yaml_data?.priority ?? null} /></td>
      <td className="px-4 py-3"><StatusTag status={task.status} /></td>
    </tr>
  )
}

function BlockedRow({ task }) {
  const reason = task.yaml_data?.reason
  return (
    <tr className="bg-red-50/60 dark:bg-red-950/20 hover:bg-red-100/60 dark:hover:bg-red-950/40 transition-all">
      <td className="pl-3 pr-4 py-3.5 border-l-4 border-red-500">
        <div className="flex items-start gap-2.5">
          <span className="relative flex-shrink-0 mt-1.5">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <div>
            <Link
              to={`/engineer/${task.project_id}/tasks/${task.id}`}
              className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 hover:underline block"
            >
              {task.title}
            </Link>
            {task.external_id && (
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{task.external_id}</span>
            )}
            {reason && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                🔒 {reason}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <Link to={`/engineer/${task.project_id}`} className="text-blue-600 hover:underline text-xs font-medium">
          {task.projects?.name ?? '—'}
        </Link>
      </td>
      <td className="px-4 py-3.5"><DeadlineCell deadline={task.deadline} /></td>
      <td className="px-4 py-3.5"><PriorityTag priority={task.yaml_data?.priority ?? null} /></td>
      <td className="px-4 py-3.5"><StatusTag status="Blocked" /></td>
    </tr>
  )
}

export default function EngineerL1Page() {
  const { data: tasks, isLoading, error } = useAllMyTasks()

  const todayStr = new Date().toISOString().slice(0, 10)
  const in7dStr  = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)

  const blocked    = filterBlockedTasks(tasks ?? [])
  const nonBlocked = (tasks ?? []).filter(t => !t.yaml_data?.blocked)
  const overdue    = nonBlocked.filter(t => t.deadline && t.deadline < todayStr)
  const thisWeek   = nonBlocked.filter(t => t.deadline && t.deadline >= todayStr && t.deadline <= in7dStr)
  const future     = nonBlocked.filter(t => !t.deadline || t.deadline > in7dStr)

  const doingCount = (tasks ?? []).filter(t => t.status === 'Doing' && !t.yaml_data?.blocked).length
  const todoCount  = (tasks ?? []).filter(t => t.status === 'Todo'  && !t.yaml_data?.blocked).length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">工程師儀表板</h1>

        {error     && <ErrorMessage message={error.message} />}
        {isLoading && <><SkeletonCard /><SkeletonCard /></>}

        {!isLoading && !error && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className={`rounded-lg border p-4 ${
                doingCount
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
              }`}>
                <p className="text-xs text-gray-400 dark:text-gray-500">進行中</p>
                <p className={`text-2xl font-bold mt-1 ${doingCount ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                  {doingCount}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-xs text-gray-400 dark:text-gray-500">待辦</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{todoCount}</p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-xs text-gray-400 dark:text-gray-500">逾期</p>
                <p className={`text-2xl font-bold mt-1 ${overdue.length ? 'text-orange-500' : 'text-gray-900 dark:text-gray-100'}`}>
                  {overdue.length}
                </p>
              </div>

              <div className={`rounded-lg border p-4 ${
                blocked.length
                  ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
              }`}>
                <p className="text-xs text-gray-400 dark:text-gray-500">卡關</p>
                <div className="flex items-center gap-2 mt-1">
                  {blocked.length > 0 && (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                    </span>
                  )}
                  <p className={`text-2xl font-bold ${blocked.length ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
                    {blocked.length}
                  </p>
                </div>
              </div>
            </div>

            {!(tasks?.length) ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                <p className="text-4xl mb-3">🎉</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">今日無待辦任務，太棒了！</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">所有任務皆已完成或尚未指派</p>
              </div>
            ) : (
              <div className="space-y-4">

                {/* ===== BLOCKED — 卡關任務（醒目提示） ===== */}
                {blocked.length > 0 && (
                  <div className="rounded-xl border-2 border-red-500 dark:border-red-600 overflow-hidden shadow-lg shadow-red-200/60 dark:shadow-red-900/40">
                    <div className="bg-gradient-to-r from-red-600 to-rose-500 dark:from-red-700 dark:to-rose-700 px-4 py-3 flex items-center gap-3">
                      <span className="text-xl select-none">🚨</span>
                      <div>
                        <p className="text-white font-bold text-sm tracking-wide">卡關任務 — 無法自行推進</p>
                        <p className="text-red-100 text-xs mt-0.5">以下任務需要 PM 協助解卡後才能繼續</p>
                      </div>
                      <span className="ml-auto bg-white/20 text-white text-sm font-bold rounded-full px-3 py-0.5 border border-white/30 flex-shrink-0">
                        {blocked.length} 筆
                      </span>
                    </div>
                    <table className="w-full text-sm bg-white dark:bg-gray-900">
                      <TableHead />
                      <tbody className="divide-y divide-red-50 dark:divide-red-950/30">
                        {blocked.map(task => <BlockedRow key={task.id} task={task} />)}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ===== OVERDUE — 逾期任務 ===== */}
                {overdue.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-orange-200 dark:border-orange-900/50 overflow-hidden">
                    <div className="bg-orange-50 dark:bg-orange-950/30 border-b border-orange-100 dark:border-orange-900/50 px-4 py-2.5 flex items-center gap-2">
                      <span className="select-none">⚠️</span>
                      <span className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider">逾期任務</span>
                      <span className="ml-auto bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 text-xs font-semibold rounded-full px-2 py-0.5">
                        {overdue.length}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <TableHead />
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {overdue.map(task => <NormalRow key={task.id} task={task} />)}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ===== THIS WEEK — 本週到期 ===== */}
                {thisWeek.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-yellow-200 dark:border-yellow-900/50 overflow-hidden">
                    <div className="bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-100 dark:border-yellow-900/50 px-4 py-2.5 flex items-center gap-2">
                      <span className="select-none">📅</span>
                      <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider">本週到期</span>
                      <span className="ml-auto bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 text-xs font-semibold rounded-full px-2 py-0.5">
                        {thisWeek.length}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <TableHead />
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {thisWeek.map(task => <NormalRow key={task.id} task={task} />)}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ===== FUTURE / UNSCHEDULED — 之後 ===== */}
                {future.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 px-4 py-2.5 flex items-center gap-2">
                      <span className="select-none">📋</span>
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">之後 / 未排程</span>
                      <span className="ml-auto bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold rounded-full px-2 py-0.5">
                        {future.length}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <TableHead />
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {future.map(task => <NormalRow key={task.id} task={task} />)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
