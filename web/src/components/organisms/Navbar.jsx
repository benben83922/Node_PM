import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Button from '../atoms/Button'
import ThemeToggle from '../atoms/ThemeToggle'

const ROLE_LABEL = { admin: 'PM', developer: '工程師', viewer: '客戶' }

export default function Navbar() {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center px-4 gap-4">
      <Link to="/" className="font-bold text-gray-900 dark:text-white text-base tracking-tight">Node PM</Link>

      <nav className="flex-1 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
        {role === 'admin' && (
          <Link to="/pm" className="hover:text-gray-900 dark:hover:text-white transition-colors">PM 視圖</Link>
        )}
        {(role === 'admin' || role === 'developer') && (
          <Link to="/engineer" className="hover:text-gray-900 dark:hover:text-white transition-colors">工程師視圖</Link>
        )}
        {role && (
          <Link to="/client" className="hover:text-gray-900 dark:hover:text-white transition-colors">客戶視圖</Link>
        )}
        {role === 'admin' && (
          <Link to="/pm/settings" className="hover:text-gray-900 dark:hover:text-white transition-colors">成員管理</Link>
        )}
      </nav>

      <div className="flex items-center gap-2">
        {user && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {ROLE_LABEL[role] ?? role} · {user.email}
          </span>
        )}
        <ThemeToggle />
        <Button variant="ghost" onClick={handleSignOut} className="text-xs">登出</Button>
      </div>
    </header>
  )
}
