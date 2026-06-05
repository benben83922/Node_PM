import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export function useProjectTasks(projectId) {
  return useQuery({
    queryKey: ['tasks', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks_sync')
        .select('id, external_id, title, status, assignee_email, deadline, wbs_path, yaml_data, updated_at')
        .eq('project_id', projectId)
        .order('external_id')
      if (error) throw error
      return data
    },
  })
}
