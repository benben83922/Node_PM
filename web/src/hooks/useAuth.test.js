import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock supabaseClient before importing useAuth
vi.mock('../lib/supabaseClient', () => {
  const mockSubscription = { unsubscribe: vi.fn() }
  return {
    supabase: {
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: mockSubscription } })),
        signOut: vi.fn(),
        signInWithOAuth: vi.fn(),
        signInWithOtp: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      })),
    },
  }
})

import { supabase } from '../lib/supabaseClient'
import { useAuth } from './useAuth'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAuth', () => {
  it('TC-AU-001: loading=true initially, resolves after getSession returns null', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    const { result } = renderHook(() => useAuth())

    expect(result.current.loading).toBe(true)

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.role).toBeNull()
  })

  it('TC-AU-002: user and role are set when session exists', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' }
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    })

    const { result } = renderHook(() => useAuth())
    await act(async () => {})

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.role).toBe('admin')
    expect(result.current.loading).toBe(false)
  })

  it('TC-AU-003: signOut calls supabase.auth.signOut', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    supabase.auth.signOut.mockResolvedValue({})

    const { result } = renderHook(() => useAuth())
    await act(async () => {})

    await act(async () => {
      await result.current.signOut()
    })

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })
})
