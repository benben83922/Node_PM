import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export function useMilestones(projectId) {
  return useQuery({
    queryKey: ['milestones', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('id, milestone_id, milestone_name, planned_date, actual_date, is_completed')
        .eq('project_id', projectId)
        .order('planned_date')
      if (error) throw error
      return data
    },
  })
}
