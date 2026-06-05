import { Link } from 'react-router-dom'
import Navbar from '../../components/organisms/Navbar'
import MilestoneTimeline from '../../components/client/MilestoneTimeline'
import CompletionDonut from '../../components/client/CompletionDonut'
import { SkeletonCard } from '../../components/atoms/Skeleton'
import ErrorMessage from '../../components/atoms/ErrorMessage'
import { useProjects } from '../../hooks/useProjects'
import { useProjectTasks } from '../../hooks/useProjectTasks'
import { useMilestones } from '../../hooks/useMilestones'
import { calcProgress } from '../../lib/progressCalc'

function ProjectSummaryCard({ project }) {
  const { data: tasks }      = useProjectTasks(project.id)
  const { data: milestones } = useMilestones(project.id)
  const progress = calcProgress(tasks)

  return (
    <Link
      to={`/client/${project.id}`}
      className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition group"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition">{project.name}</h2>
        <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition">查看 Roadmap →</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CompletionDonut tasks={tasks} />
        <MilestoneTimeline milestones={milestones} />
      </div>

      <div className="mt-4 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
        <div className="h-1.5 bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">{progress}% 完成</p>
    </Link>
  )
}

export default function ClientL1Page() {
  const { data: projects, isLoading, error } = useProjects()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">專案進度報告</h1>

        {error    && <ErrorMessage message={error.message} />}
        {isLoading && <><SkeletonCard /><SkeletonCard /></>}

        {!isLoading && !error && projects?.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-16">目前沒有專案</p>
        )}

        {!isLoading && !error && projects?.map(p => (
          <ProjectSummaryCard key={p.id} project={p} />
        ))}
      </main>
    </div>
  )
}
