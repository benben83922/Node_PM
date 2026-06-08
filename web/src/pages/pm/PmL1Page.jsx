import { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/organisms/Navbar'
import PmProjectCard from '../../components/pm/PmProjectCard'
import { SkeletonCard } from '../../components/atoms/Skeleton'
import ErrorMessage from '../../components/atoms/ErrorMessage'
import { useProjects } from '../../hooks/useProjects'
import { useSyncStatus } from '../../hooks/useSyncStatus'
import { useWeeklyMilestones } from '../../hooks/useWeeklyMilestones'
import { formatDateTime, formatDate, syncFreshness, daysUntil } from '../../lib/formatters'

const TABS = [
  { key: 'active',   label: '進行中' },
  { key: 'archived', label: '已封存' },
]

const FRESHNESS_DOT = {
  fresh:   'bg-green-400',
  warning: 'bg-yellow-400',
  stale:   'bg-red-400',
  unknown: 'bg-gray-300',
}
const FRESHNESS_LABEL = {
  fresh:   '資料新鮮',
  warning: '超過 2 小時未更新',
  stale:   '超過 24 小時未更新',
  unknown: '尚無同步記錄',
}

function SyncStatusBar({ lastSyncAt }) {
  const freshness = syncFreshness(lastSyncAt)
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
      <span
        className={`inline-block w-2 h-2 rounded-full ${FRESHNESS_DOT[freshness]}`}
        title={FRESHNESS_LABEL[freshness]}
      />
      <span>
        最後同步：{formatDateTime(lastSyncAt)}
        {freshness !== 'fresh' && (
          <span className="ml-1 text-yellow-500 dark:text-yellow-400">（{FRESHNESS_LABEL[freshness]}）</span>
        )}
      </span>
    </div>
  )
}

function WeeklyMilestonesPanel({ milestones }) {
  if (!milestones?.length) return null

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
      <h2 className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-1">
        📅 本週即將到期里程碑（{milestones.length} 個）
      </h2>
      <div className="flex flex-wrap gap-2">
        {milestones.map(m => {
          const days = daysUntil(m.planned_date)
          return (
            <Link
              key={m.id}
              to={`/pm/${m.project_id}/milestones`}
              className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-sm transition"
            >
              <div>
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{m.milestone_name}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{m.projects?.name}</p>
              </div>
              <span className={`text-xs font-semibold ml-1 ${days === 0 ? 'text-red-600' : days <= 2 ? 'text-orange-500' : 'text-amber-600 dark:text-amber-400'}`}>
                {days === 0 ? '今天到期' : `${days} 天後`}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function PmL1Page() {
  const { data: projects, isLoading, error } = useProjects()
  const { data: lastSyncAt }                 = useSyncStatus()
  const { data: weeklyMilestones }           = useWeeklyMilestones()
  const [tab, setTab] = useState('active')

  const active   = projects?.filter(p => p.status === 'active')   ?? []
  const archived = projects?.filter(p => p.status !== 'active')   ?? []
  const shown    = tab === 'active' ? active : archived

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">PM 儀表板</h1>
            <SyncStatusBar lastSyncAt={lastSyncAt} />
          </div>
          <Link to="/pm/settings" className="text-sm text-blue-600 hover:underline">
            成員管理 →
          </Link>
        </div>

        {/* 本週里程碑 */}
        <WeeklyMilestonesPanel milestones={weeklyMilestones} />

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t.label}
              {!isLoading && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t.key
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {t.key === 'active' ? active.length : archived.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {error    && <ErrorMessage message={error.message} />}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonCard /><SkeletonCard />
          </div>
        )}

        {!isLoading && !error && shown.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-16">
            {tab === 'active'
              ? '目前尚無進行中的專案，請新增專案或聯繫系統管理員'
              : '尚無已封存的專案'}
          </p>
        )}

        {!isLoading && !error && shown.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shown.map(p => (
              <PmProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
