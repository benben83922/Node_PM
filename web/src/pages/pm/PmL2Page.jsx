import { useParams, Link } from 'react-router-dom'
import Navbar from '../../components/organisms/Navbar'
import SCurveChart from '../../components/pm/SCurveChart'
import CfdChart from '../../components/pm/CfdChart'
import BlockerList from '../../components/pm/BlockerList'
import MilestoneCard from '../../components/molecules/MilestoneCard'
import { SkeletonCard } from '../../components/atoms/Skeleton'
import ErrorMessage from '../../components/atoms/ErrorMessage'
import { useMilestones } from '../../hooks/useMilestones'
import { useProjectTasks } from '../../hooks/useProjectTasks'
import { useProjects } from '../../hooks/useProjects'
import { calcProgress } from '../../lib/progressCalc'
import { filterOverdueTasks } from '../../lib/taskFilters'
import { formatDate } from '../../lib/formatters'

export default function PmL2Page() {
  const { projectId } = useParams()
  const { data: projects }                                        = useProjects()
  const { data: milestones, isLoading: mLoading, error: mError } = useMilestones(projectId)
  const { data: tasks,      isLoading: tLoading, error: tError } = useProjectTasks(projectId)

  const loading  = mLoading || tLoading
  const error    = mError   || tError
  const project  = projects?.find(p => p.id === projectId)
  const overdue  = filterOverdueTasks(tasks)
  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6 space-y-6">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/pm" className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">← 返回</Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {project?.name ?? '載入中…'} — 專案診斷
            </h1>
          </div>
          <Link to={`/pm/${projectId}/tasks`} className="text-sm text-blue-600 hover:underline">
            查看所有任務 →
          </Link>
        </div>

        {error   && <ErrorMessage message={error.message} />}
        {loading && <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>}

        {!loading && !error && (
          <>
            {/* S-Curve */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">S 曲線（計畫 vs 實際）</h2>
              <SCurveChart milestones={milestones} tasks={tasks} />
            </div>

            {/* Overdue + Blocked */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  逾期任務
                  {overdue.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-red-500">{overdue.length} 筆</span>
                  )}
                </h2>
                {overdue.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">沒有逾期任務 🎉</p>
                ) : (
                  <ul className="space-y-2">
                    {[...overdue]
                      .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
                      .map(t => {
                        const days = Math.floor((new Date(todayStr) - new Date(t.deadline)) / 86400000)
                        return (
                          <li key={t.id} className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded-md">
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/pm/${projectId}/tasks/${t.id}`}
                                className="text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-blue-600 hover:underline truncate block"
                              >
                                {t.title}
                              </Link>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                {t.external_id} · {formatDate(t.deadline)}
                                <span className="text-red-500 ml-1">（逾期 {days} 天）</span>
                              </p>
                            </div>
                          </li>
                        )
                      })}
                  </ul>
                )}
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">卡關任務</h2>
                <BlockerList tasks={tasks} />
              </div>
            </div>

            {/* CFD */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">任務狀態分佈（CFD）</h2>
              <CfdChart tasks={tasks} />
            </div>

            {/* Milestones */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">里程碑進度</h2>
              {milestones?.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500">尚無里程碑資料</p>
              )}
              {milestones?.map(m => {
                const mTasks   = tasks?.filter(t => t.wbs_path?.startsWith(m.milestone_id)) ?? []
                const progress = calcProgress(mTasks)
                return (
                  <div key={m.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <MilestoneCard milestone={m} />
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-4 shrink-0">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                      <div className="h-1.5 bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{mTasks.length} 個任務</p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
