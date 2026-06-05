import { useParams } from 'react-router-dom'
import Navbar from '../../components/organisms/Navbar'
import KanbanView from '../../components/engineer/KanbanView'
import { SkeletonCard } from '../../components/atoms/Skeleton'
import ErrorMessage from '../../components/atoms/ErrorMessage'
import { useProjectTasks } from '../../hooks/useProjectTasks'

export default function EngineerL2Page() {
  const { projectId } = useParams()
  const { data: tasks, isLoading, error } = useProjectTasks(projectId)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">專案 Kanban</h1>

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
