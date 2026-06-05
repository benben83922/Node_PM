import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../hooks/useAuth'
import RoleGuard from './RoleGuard'

function wrap(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('RoleGuard', () => {
  it('shows spinner while loading', () => {
    useAuth.mockReturnValue({ user: null, role: null, loading: true })
    wrap(<RoleGuard allowedRoles={['admin']}><div>protected</div></RoleGuard>)
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
  })

  it('redirects to /login when unauthenticated', () => {
    useAuth.mockReturnValue({ user: null, role: null, loading: false })
    wrap(<RoleGuard allowedRoles={['admin']}><div>protected</div></RoleGuard>)
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
  })

  it('renders children for allowed role', () => {
    useAuth.mockReturnValue({ user: { id: '1' }, role: 'admin', loading: false })
    wrap(<RoleGuard allowedRoles={['admin']}><div>protected</div></RoleGuard>)
    expect(screen.getByText('protected')).toBeInTheDocument()
  })

  it('redirects to /forbidden for disallowed role', () => {
    useAuth.mockReturnValue({ user: { id: '1' }, role: 'viewer', loading: false })
    wrap(<RoleGuard allowedRoles={['admin']}><div>protected</div></RoleGuard>)
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
  })
})
