import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export function useTask(projectId, taskId) {
  return useQuery({
    queryKey: ['task', projectId, taskId],
    enabled: !!projectId && !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks_sync')
        .select('*')
        .eq('project_id', projectId)
        .eq('id', taskId)
        .single()
      if (error) throw error
      return data
    },
  })
}
