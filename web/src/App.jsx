import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.js'
import LoginPage from './pages/LoginPage.jsx'
import ForbiddenPage from './pages/ForbiddenPage.jsx'
import AuthCallbackPage from './pages/AuthCallbackPage.jsx'
import RoleGuard from './components/RoleGuard.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Spinner from './components/atoms/Spinner.jsx'

// PM pages
import PmL1Page         from './pages/pm/PmL1Page.jsx'
import PmL2Page         from './pages/pm/PmL2Page.jsx'
import PmL3Page         from './pages/pm/PmL3Page.jsx'
import PmTaskDetailPage from './pages/pm/PmTaskDetailPage.jsx'
import PmSettingsPage   from './pages/pm/PmSettingsPage.jsx'

// Engineer pages
import EngineerL1Page from './pages/engineer/EngineerL1Page.jsx'
import EngineerL2Page from './pages/engineer/EngineerL2Page.jsx'
import EngineerL3Page from './pages/engineer/EngineerL3Page.jsx'

// Client pages
import ClientL1Page from './pages/client/ClientL1Page.jsx'
import ClientL2Page from './pages/client/ClientL2Page.jsx'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}

export default function App() {
  const { user, role, loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/forbidden"     element={<ForbiddenPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* PM routes — admin only */}
        <Route path="/pm"                            element={<RoleGuard allowedRoles={['admin']}><PmL1Page /></RoleGuard>} />
        <Route path="/pm/settings"                   element={<RoleGuard allowedRoles={['admin']}><PmSettingsPage /></RoleGuard>} />
        <Route path="/pm/:projectId/milestones"      element={<RoleGuard allowedRoles={['admin']}><PmL2Page /></RoleGuard>} />
        <Route path="/pm/:projectId/tasks"           element={<RoleGuard allowedRoles={['admin']}><PmL3Page /></RoleGuard>} />
        <Route path="/pm/:projectId/tasks/:taskId"   element={<RoleGuard allowedRoles={['admin']}><PmTaskDetailPage /></RoleGuard>} />

        {/* Engineer routes — admin + developer */}
        <Route path="/engineer"                              element={<RoleGuard allowedRoles={['admin','developer']}><EngineerL1Page /></RoleGuard>} />
        <Route path="/engineer/:projectId"                   element={<RoleGuard allowedRoles={['admin','developer']}><EngineerL2Page /></RoleGuard>} />
        <Route path="/engineer/:projectId/tasks/:taskId"     element={<RoleGuard allowedRoles={['admin','developer']}><EngineerL3Page /></RoleGuard>} />

        {/* Client routes — all authenticated */}
        <Route path="/client"              element={<RoleGuard allowedRoles={['admin','developer','viewer']}><ClientL1Page /></RoleGuard>} />
        <Route path="/client/:projectId"   element={<RoleGuard allowedRoles={['admin','developer','viewer']}><ClientL2Page /></RoleGuard>} />

        {/* Root redirect by role */}
        <Route
          path="/"
          element={
            !user   ? <Navigate to="/login" replace /> :
            role === 'admin'     ? <Navigate to="/pm" replace /> :
            role === 'developer' ? <Navigate to="/engineer" replace /> :
                                   <Navigate to="/client" replace />
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
