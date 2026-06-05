import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient.js'

export function useAuth() {
  const [user, setUser]     = useState(null)
  const [role, setRole]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 初始化：取得當前 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchRole(session.user.id)
      else setLoading(false)
    })

    // 監聽 auth 狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) fetchRole(session.user.id)
        else { setRole(null); setLoading(false) }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchRole(userId) {
    const { data } = await supabase
      .from('project_access')
      .select('role')
      .eq('user_id', userId)
      .limit(1)
      .single()

    setRole(data?.role ?? null)
    setLoading(false)
  }

  function signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
  }

  function signInWithMagicLink(email) {
    return supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
  }

  function signOut() {
    return supabase.auth.signOut()
  }

  return { user, role, loading, signInWithGoogle, signInWithMagicLink, signOut }
}
