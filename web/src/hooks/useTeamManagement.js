import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient.js'

export function useProjectMembers(projectId) {
  return useQuery({
    queryKey: ['members', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_project_members', { p_project_id: projectId })
      if (error) throw error
      return data
    },
    enabled: !!projectId,
  })
}

export function useInviteUser(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, role }) => {
      const { data, error } = await supabase
        .rpc('invite_user', { p_email: email, p_project_id: projectId, p_role: role })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', projectId] })
    },
  })
}

export function useRemoveMember(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId) => {
      const { data, error } = await supabase
        .rpc('remove_member', { p_user_id: userId, p_project_id: projectId })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', projectId] })
    },
  })
}
