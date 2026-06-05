import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
)

export default function RoleGuard({ children, allowedRoles }) {
  const { user, role, loading } = useAuth()

  if (loading) return <Spinner />
  if (!user)   return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/forbidden" replace />

  return children
}
