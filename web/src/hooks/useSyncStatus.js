import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync-status'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks_sync')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data?.updated_at ?? null
    },
  })
}
