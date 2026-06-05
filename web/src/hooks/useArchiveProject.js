import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export function useArchiveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId) => {
      const { data, error } = await supabase.rpc('archive_project', { p_project_id: projectId })
      if (error) throw error
      if (data !== 'ok') throw new Error(data)
      return projectId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
