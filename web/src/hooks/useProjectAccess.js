import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from './useAuth.js'

export function useProjectAccess() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['project_access', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_access')
        .select('project_id, role')
        .eq('user_id', user.id)

      if (error) throw error
      return data ?? []
    },
    staleTime: 10 * 60 * 1000,
  })
}

// Derived: highest role the user holds across all projects
export function useGlobalRole() {
  const { data: access = [] } = useProjectAccess()
  const PRIORITY = { admin: 3, developer: 2, viewer: 1 }
  if (!access.length) return null
  return access.reduce((best, { role }) =>
    (PRIORITY[role] ?? 0) > (PRIORITY[best] ?? 0) ? role : best
  , access[0].role)
}
