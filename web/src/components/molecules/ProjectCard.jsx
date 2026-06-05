import { Link } from 'react-router-dom'
import { calcProgress } from '../../lib/progressCalc'
import { calcHealth, HEALTH_LABEL, HEALTH_COLOR } from '../../lib/healthCalc'
import Badge from '../atoms/Badge'

const HEALTH_BADGE_COLOR = { normal: 'green', warning: 'yellow', critical: 'red' }

export default function ProjectCard({ project, tasks = [], basePath }) {
  const progress = calcProgress(tasks)
  const health   = calcHealth(tasks)

  return (
    <Link to={`${basePath}/${project.id}`} className="block rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow bg-white">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
        <Badge color={HEALTH_BADGE_COLOR[health]}>
          <span className={HEALTH_COLOR[health]}>{HEALTH_LABEL[health]}</span>
        </Badge>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-2 bg-blue-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 w-10 text-right">{progress}%</span>
      </div>
    </Link>
  )
}
