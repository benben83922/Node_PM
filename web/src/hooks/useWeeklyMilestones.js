import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export function useWeeklyMilestones() {
  return useQuery({
    queryKey: ['milestones-weekly'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      const in7d  = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('milestones')
        .select('id, milestone_name, planned_date, is_completed, project_id, projects(id, name)')
        .gte('planned_date', today)
        .lte('planned_date', in7d)
        .eq('is_completed', false)
        .order('planned_date')
      if (error) throw error
      return data
    },
  })
}
