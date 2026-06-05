import { Link } from 'react-router-dom'
import HealthBadge from './HealthBadge'
import { SkeletonCard } from '../atoms/Skeleton'
import { useProjectTasks } from '../../hooks/useProjectTasks'
import { useMilestones } from '../../hooks/useMilestones'
import { useArchiveProject } from '../../hooks/useArchiveProject'
import { calcProgress } from '../../lib/progressCalc'
import { calcHealth } from '../../lib/healthCalc'
import { filterOverdueTasks } from '../../lib/taskFilters'

function daysUntil(dateStr) {
  const today = new Date().toISOString().slice(0, 10)
  const ms = new Date(dateStr + 'T00:00:00') - new Date(today + 'T00:00:00')
  return Math.ceil(ms / 86400000)
}

export default function PmProjectCard({ project }) {
  const { data: tasks,      isLoading: tLoading } = useProjectTasks(project.id)
  const { data: milestones, isLoading: mLoading } = useMilestones(project.id)
  const { mutate: archive, isPending: archiving }  = useArchiveProject()

  if (tLoading || mLoading) return <SkeletonCard />

  const progress      = calcProgress(tasks)
  const health        = calcHealth(tasks)
  const overdue       = filterOverdueTasks(tasks)
  const todayStr      = new Date().toISOString().slice(0, 10)
  const nextMilestone = milestones
    ?.filter(m => !m.is_completed && m.planned_date >= todayStr)
    .sort((a, b) => a.planned_date.localeCompare(b.planned_date))[0]

  function handleArchive(e) {
    e.preventDefault()
    if (!window.confirm(`確定要封存「${project.name}」嗎？封存後可在「已封存」分頁查看。`)) return
    archive(project.id)
  }

  return (
    <div className="relative group">
      <Link
        to={`/pm/${project.id}/milestones`}
        className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-2 pr-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition">
            {project.name}
          </h2>
          <HealthBadge status={health} />
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
            <span>整體進度</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <div
              className="h-2 bg-blue-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {tasks?.filter(t => t.status === 'Done').length ?? 0} / {tasks?.length ?? 0} 任務完成
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className="text-gray-400 dark:text-gray-500">
            {nextMilestone ? (
              <>
                {'📅 '}{nextMilestone.milestone_name}
                <span className="ml-1 font-medium text-gray-600 dark:text-gray-400">
                  （{daysUntil(nextMilestone.planned_date)} 天後）
                </span>
              </>
            ) : '暫無近期里程碑'}
          </span>
          {overdue.length > 0 && (
            <span className="text-red-500 font-medium">⚠ 逾期 {overdue.length}</span>
          )}
        </div>
      </Link>

      {/* Archive button — floats top-right, outside the Link */}
      <button
        onClick={handleArchive}
        disabled={archiving}
        title="封存此專案"
        className="absolute top-3 right-3 p-1 rounded text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition opacity-0 group-hover:opacity-100 disabled:opacity-30"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8M10 12v4m4-4v4" />
        </svg>
      </button>
    </div>
  )
}
