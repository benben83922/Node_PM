import { useParams } from 'react-router-dom'
import Navbar from '../../components/organisms/Navbar'
import TaskRow from '../../components/molecules/TaskRow'
import { SkeletonCard } from '../../components/atoms/Skeleton'
import ErrorMessage from '../../components/atoms/ErrorMessage'
import { useProjectTasks } from '../../hooks/useProjectTasks'

export default function PmL3Page() {
  const { projectId } = useParams()
  const { data: tasks, isLoading, error } = useProjectTasks(projectId)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">任務清單（PM）</h1>

        {error    && <ErrorMessage message={error.message} />}
        {isLoading && <SkeletonCard />}

        {!isLoading && !error && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <th className="py-2 px-3">ID</th>
                  <th className="py-2 px-3">標題</th>
                  <th className="py-2 px-3">狀態</th>
                  <th className="py-2 px-3">負責人</th>
                  <th className="py-2 px-3">截止日</th>
                </tr>
              </thead>
              <tbody>
                {tasks?.map(t => (
                  <TaskRow key={t.id} task={t} detailPath={`/pm/${projectId}/tasks/${t.id}`} />
                ))}
              </tbody>
            </table>
            {tasks?.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">無任務資料</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
