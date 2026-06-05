import { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/organisms/Navbar'
import PmProjectCard from '../../components/pm/PmProjectCard'
import { SkeletonCard } from '../../components/atoms/Skeleton'
import ErrorMessage from '../../components/atoms/ErrorMessage'
import { useProjects } from '../../hooks/useProjects'

const TABS = [
  { key: 'active',   label: '進行中' },
  { key: 'archived', label: '已封存' },
]

export default function PmL1Page() {
  const { data: projects, isLoading, error } = useProjects()
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">PM 儀表板</h1>
          <Link to="/pm/settings" className="text-sm text-blue-600 hover:underline">
            成員管理 →
          </Link>
        </div>

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
