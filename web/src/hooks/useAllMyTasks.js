import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './useAuth'

export function useAllMyTasks() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['all-my-tasks', user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks_sync')
        .select('id, external_id, title, status, deadline, yaml_data, project_id, projects(id, name)')
        .eq('assignee_email', user.email)
        .neq('status', 'Done')
        .order('deadline', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data
    },
  })
}
