import { useProjects } from '../../hooks/useProjects'
import Spinner from '../atoms/Spinner'
import ErrorMessage from '../atoms/ErrorMessage'

export default function ProjectSelector({ selectedId, onSelect }) {
  const { data: projects, isLoading, error } = useProjects()

  if (isLoading) return <Spinner size="sm" />
  if (error) return <ErrorMessage message={error.message} />

  return (
    <select
      value={selectedId ?? ''}
      onChange={e => onSelect(e.target.value)}
      className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="" disabled>選擇專案</option>
      {projects?.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  )
}
