import { useParams, Link } from 'react-router-dom'
import Navbar from '../../components/organisms/Navbar'
import RoadmapTimeline from '../../components/client/RoadmapTimeline'
import CompletionDonut from '../../components/client/CompletionDonut'
import { SkeletonCard } from '../../components/atoms/Skeleton'
import ErrorMessage from '../../components/atoms/ErrorMessage'
import { useMilestones } from '../../hooks/useMilestones'
import { useProjectTasks } from '../../hooks/useProjectTasks'
import { useProjects } from '../../hooks/useProjects'
import { calcProgress } from '../../lib/progressCalc'

export default function ClientL2Page() {
  const { projectId } = useParams()
  const { data: projects }                                             = useProjects()
  const { data: milestones, isLoading: mLoading, error: mError }      = useMilestones(projectId)
  const { data: tasks,      isLoading: tLoading, error: tError }      = useProjectTasks(projectId)

  const loading  = mLoading || tLoading
  const error    = mError   || tError
  const progress = calcProgress(tasks)
  const project  = projects?.find(p => p.id === projectId)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/client" className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">← 返回</Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{project?.name ?? '專案'} Roadmap</h1>
        </div>

        {error   && <ErrorMessage message={error.message} />}
        {loading && <><SkeletonCard /><SkeletonCard /></>}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 sm:col-span-1 flex items-center justify-center">
                <CompletionDonut tasks={tasks} />
              </div>
              <div className="sm:col-span-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-2">
                <p className="text-xs text-gray-400 dark:text-gray-500">整體進度</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{progress}%</p>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {tasks?.filter(t => t.status === 'Done').length ?? 0} / {tasks?.length ?? 0} 任務完成
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">里程碑 Roadmap</h2>
              <RoadmapTimeline milestones={milestones} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
