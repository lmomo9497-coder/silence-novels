import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Profile, Role } from '../lib/types'

interface AuthCtx {
  session: Session | null
  user: User | null
  profile: Profile | null
  permissions: Set<string>
  loading: boolean
  isOwner: boolean
  isStaff: boolean
  isAuthenticated: boolean
  hasPermission: (perm: string) => boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ error: string | null; needsConfirm: boolean }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [permissions, setPermissions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured) return
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (data) {
      setProfile(data as Profile)
      // صلاحيات الدور + الصلاحيات الإضافية
      const perms = new Set<string>()
      const { data: rp } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', (data as Profile).role)
      rp?.forEach((r: any) => perms.add(r.permission_id))
      const { data: up } = await supabase
        .from('user_permissions')
        .select('permission_id')
        .eq('user_id', userId)
      up?.forEach((r: any) => perms.add(r.permission_id))
      setPermissions(perms)
    } else {
      setProfile(null)
      setPermissions(new Set())
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => mounted && setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        loadProfile(newSession.user.id)
      } else {
        setProfile(null)
        setPermissions(new Set())
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName } },
    })
    return { error: error?.message ?? null, needsConfirm: !data.session }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setPermissions(new Set())
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id)
  }, [session, loadProfile])

  const role: Role = profile?.role ?? 'reader'
  const isOwner = role === 'owner'
  const isStaff = role === 'owner' || role === 'staff'

  const hasPermission = useCallback(
    (perm: string) => isOwner || permissions.has(perm),
    [isOwner, permissions],
  )

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      permissions,
      loading,
      isOwner,
      isStaff,
      isAuthenticated: Boolean(session?.user),
      hasPermission,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }),
    [session, profile, permissions, loading, isOwner, isStaff, hasPermission, signIn, signUp, signInWithGoogle, signOut, refreshProfile],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
