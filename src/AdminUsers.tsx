import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Ban,
  Check,
  Crown,
  Loader2,
  Search,
  ShieldCheck,
  ShieldOff,
  UserCog,
  Users,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { PageLoader } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { Avatar } from '../../components/ui/Avatar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { cn, formatDate } from '../../lib/utils'
import type { Permission, Profile, Role } from '../../lib/types'

const ROLE_LABEL: Record<Role, string> = {
  owner: 'المالك',
  staff: 'مشرف',
  reader: 'قارئ',
}

const ROLE_STYLE: Record<Role, string> = {
  owner: 'bg-gold-100 text-gold-700 dark:bg-gold-500/20 dark:text-gold-300',
  staff: 'bg-sage-100 text-sage-700 dark:bg-sage-500/15 dark:text-sage-300',
  reader: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
}

export default function AdminUsers() {
  const { user, isOwner } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<Profile[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all')

  const [editing, setEditing] = useState<Profile | null>(null)
  const [userPerms, setUserPerms] = useState<Set<string>>(new Set())
  const [savingPerms, setSavingPerms] = useState(false)
  const [toBan, setToBan] = useState<Profile | null>(null)
  const [banning, setBanning] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: profs }, { data: perms }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('permissions').select('*').order('id'),
    ])
    setUsers((profs ?? []) as Profile[])
    setPermissions((perms ?? []) as Permission[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (!s) return true
      return (
        (u.display_name ?? '').toLowerCase().includes(s) ||
        (u.username ?? '').toLowerCase().includes(s) ||
        u.id.toLowerCase().includes(s)
      )
    })
  }, [users, search, roleFilter])

  const changeRole = async (target: Profile, role: Role) => {
    if (!isOwner) {
      error('تغيير الأدوار متاح للمالك فقط')
      return
    }
    if (target.role === 'owner') {
      error('لا يمكن تعديل دور المالك')
      return
    }
    if (target.id === user?.id) {
      error('لا يمكنك تغيير دورك بنفسك')
      return
    }
    const { error: e } = await supabase.from('profiles').update({ role }).eq('id', target.id)
    if (e) {
      error(e.message || 'تعذّر تحديث الدور')
      return
    }
    setUsers((us) => us.map((u) => (u.id === target.id ? { ...u, role } : u)))
    success(`تم تعيين الدور: ${ROLE_LABEL[role]}`)
  }

  const openPermissions = async (target: Profile) => {
    setEditing(target)
    const { data } = await supabase.from('user_permissions').select('permission_id').eq('user_id', target.id)
    setUserPerms(new Set((data ?? []).map((r: any) => r.permission_id)))
  }

  const togglePerm = (id: string) => {
    setUserPerms((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const savePermissions = async () => {
    if (!editing || !user) return
    setSavingPerms(true)
    try {
      await supabase.from('user_permissions').delete().eq('user_id', editing.id)
      if (userPerms.size) {
        const rows = Array.from(userPerms).map((permission_id) => ({
          user_id: editing.id,
          permission_id,
          granted_by: user.id,
        }))
        const { error: e } = await supabase.from('user_permissions').insert(rows)
        if (e) throw e
      }
      success('تم تحديث الصلاحيات')
      setEditing(null)
    } catch (err: any) {
      error(err?.message || 'تعذّر حفظ الصلاحيات')
    } finally {
      setSavingPerms(false)
    }
  }

  const confirmBan = async () => {
    if (!toBan) return
    setBanning(true)
    const next = !toBan.is_banned
    const { error: e } = await supabase.from('profiles').update({ is_banned: next }).eq('id', toBan.id)
    setBanning(false)
    if (e) {
      error('تعذّر تحديث حالة الحساب')
      return
    }
    setUsers((us) => us.map((u) => (u.id === toBan.id ? { ...u, is_banned: next } : u)))
    success(next ? 'تم حظر الحساب' : 'تم رفع الحظر')
    setToBan(null)
  }

  if (loading) return <PageLoader />

  return (
    <div className="container-app py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-100 text-gold-600 dark:bg-gold-500/15 dark:text-gold-400">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900 dark:text-parchment-100">
            إدارة المستخدمين
          </h1>
          <p className="text-xs text-ink-400">{users.length} مستخدم</p>
        </div>
      </div>

      {!isOwner && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          أنت لست المالك — يمكنك العرض فقط. تغيير الأدوار والصلاحيات متاح للمالك.
        </div>
      )}

      {/* أدوات البحث والفلترة */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-ink-400" />
          <input
            className="input ps-9"
            placeholder="ابحث بالاسم أو المعرّف…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'owner', 'staff', 'reader'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn('chip', roleFilter === r && 'chip-active')}
            >
              {r === 'all' ? 'الكل' : ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="card divide-y divide-ink-100 dark:divide-ink-800">
          {filtered.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              <Avatar src={u.avatar_url} name={u.display_name || u.username || 'م'} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-ink-800 dark:text-ink-100">
                    {u.display_name || u.username || 'مستخدم'}
                  </p>
                  {u.role === 'owner' && <Crown className="h-4 w-4 text-gold-500" />}
                  {u.is_banned && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-600 dark:bg-red-500/15 dark:text-red-300">
                      محظور
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-ink-400">
                  {u.username ? `@${u.username} · ` : ''}
                  {formatDate(u.created_at)}
                </p>
              </div>

              <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', ROLE_STYLE[u.role])}>
                {ROLE_LABEL[u.role]}
              </span>

              {isOwner && u.role !== 'owner' && u.id !== user?.id && (
                <div className="flex items-center gap-1.5">
                  <select
                    className="input w-auto py-1.5 text-xs"
                    value={u.role}
                    onChange={(e) => changeRole(u, e.target.value as Role)}
                  >
                    <option value="reader">قارئ</option>
                    <option value="staff">مشرف</option>
                  </select>
                  <button
                    className="btn-ghost btn-sm"
                    title="الصلاحيات"
                    onClick={() => openPermissions(u)}
                  >
                    <UserCog className="h-4 w-4" />
                  </button>
                  <button
                    className={cn('btn-ghost btn-sm', u.is_banned ? 'text-sage-600' : 'text-red-500')}
                    title={u.is_banned ? 'رفع الحظر' : 'حظر'}
                    onClick={() => setToBan(u)}
                  >
                    {u.is_banned ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Users className="h-6 w-6" />} title="لا يوجد مستخدمون مطابقون" />
      )}

      {/* صلاحيات المستخدم */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`صلاحيات ${editing?.display_name || editing?.username || ''}`}
        size="md"
        footer={
          <>
            <button className="btn-outline" onClick={() => setEditing(null)} disabled={savingPerms}>
              إلغاء
            </button>
            <button className="btn-gold" onClick={savePermissions} disabled={savingPerms}>
              {savingPerms ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              حفظ
            </button>
          </>
        }
      >
        <p className="mb-3 text-xs text-ink-400">
          الصلاحيات الإضافية تُمنح فوق صلاحيات الدور. المالك يملك كل الصلاحيات دائمًا.
        </p>
        <div className="space-y-2">
          {permissions.map((p) => {
            const active = userPerms.has(p.id)
            return (
              <button
                key={p.id}
                onClick={() => togglePerm(p.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border p-3 text-start transition',
                  active
                    ? 'border-gold-400 bg-gold-50 dark:bg-gold-500/10'
                    : 'border-ink-100 hover:border-gold-300 dark:border-ink-800',
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                    active ? 'border-gold-500 bg-gold-500 text-white' : 'border-ink-300 dark:border-ink-600',
                  )}
                >
                  {active && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink-800 dark:text-ink-100">
                    {p.name_ar}
                  </span>
                  {p.description && <span className="block text-xs text-ink-400">{p.description}</span>}
                </span>
              </button>
            )
          })}
        </div>
      </Modal>

      {/* تأكيد الحظر */}
      <ConfirmDialog
        open={!!toBan}
        onClose={() => setToBan(null)}
        onConfirm={confirmBan}
        loading={banning}
        danger={!toBan?.is_banned}
        title={toBan?.is_banned ? 'رفع الحظر' : 'حظر الحساب'}
        confirmLabel={toBan?.is_banned ? 'رفع الحظر' : 'حظر'}
        message={
          toBan?.is_banned
            ? `سيتمكّن «${toBan?.display_name || toBan?.username}» من استخدام المنصة مجددًا.`
            : `سيتم منع «${toBan?.display_name || toBan?.username}» من النشر والتفاعل.`
        }
      />
    </div>
  )
}
