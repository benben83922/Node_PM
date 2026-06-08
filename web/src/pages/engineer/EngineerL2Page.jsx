import { Link, useParams } from 'react-router-dom'
import Navbar from '../../components/organisms/Navbar'
import KanbanView from '../../components/engineer/KanbanView'
import { SkeletonCard } from '../../components/atoms/Skeleton'
import ErrorMessage from '../../components/atoms/ErrorMessage'
import { useProjectTasks } from '../../hooks/useProjectTasks'
import { useProjects } from '../../hooks/useProjects'

export default function EngineerL2Page() {
  const { projectId } = useParams()
  const { data: tasks, isLoading, error } = useProjectTasks(projectId)
  const { data: projects } = useProjects()
  const project = projects?.find(p => p.id === projectId)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/engineer" className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">← 返回</Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {project?.name ?? '載入中…'} — Kanban
          </h1>
        </div>

        {error    && <ErrorMessage message={error.message} />}
        {isLoading && <SkeletonCard />}

        {!isLoading && !error && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
            <KanbanView tasks={tasks} basePath={`/engineer/${projectId}`} />
          </div>
        )}
      </main>
    </div>
  )
}
