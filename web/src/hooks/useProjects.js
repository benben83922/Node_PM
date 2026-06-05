import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, repo_full_name, status, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}
