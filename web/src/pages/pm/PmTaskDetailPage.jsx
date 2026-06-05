import { useParams } from 'react-router-dom'
import Navbar from '../../components/organisms/Navbar'
import TaskDetail from '../../components/shared/TaskDetail'
import { useTask } from '../../hooks/useTask'

export default function PmTaskDetailPage() {
  const { projectId, taskId } = useParams()
  const { data: task, isLoading, error } = useTask(projectId, taskId)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-2xl mx-auto p-6">
        <TaskDetail task={task} isLoading={isLoading} error={error} />
      </main>
    </div>
  )
}
