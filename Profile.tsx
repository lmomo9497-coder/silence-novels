import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  BookOpen,
  Camera,
  Clock,
  Heart,
  History,
  Loader2,
  LogOut,
  Save,
  Sparkles,
  User as UserIcon,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { PageLoader } from '../components/ui/Spinner'
import { NovelGrid } from '../components/novel/NovelCard'
import { uploadFile } from '../lib/storage'
import { cn, formatDate, timeAgo } from '../lib/utils'
import type { Novel } from '../lib/types'

type Tab = 'profile' | 'favorites' | 'history' | 'progress'

const TABS: { id: Tab; label: string; icon: typeof UserIcon }[] = [
  { id: 'profile', label: 'الملف الشخصي', icon: UserIcon },
  { id: 'favorites', label: 'المفضلة', icon: Heart },
  { id: 'history', label: 'سجل القراءة', icon: History },
  { id: 'progress', label: 'تقدّم القراءة', icon: Clock },
]

interface HistoryRow {
  id: string
  read_at: string
  novel: Novel | null
  chapter: { id: string; title: string; chapter_number: number; slug: string } | null
}

interface ProgressRow {
  novel_id: string
  chapter_id: string | null
  scroll_percent: number
  updated_at: string
  novel: Novel | null
  chapter: { id: string; title: string; chapter_number: number; slug: string } | null
}

export default function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const { success, error } = useToast()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'profile'

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params)
    next.set('tab', t)
    setParams(next, { replace: true })
  }

  if (!user) return <PageLoader />

  return (
    <div className="container-app py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar src={profile?.avatar_url} name={profile?.display_name} size={64} />
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-parchment-100">
              {profile?.display_name || 'قارئ'}
            </h1>
            <p className="text-sm text-ink-500 dark:text-ink-400">{user.email}</p>
          </div>
        </div>
        <button className="btn-outline self-start" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" /> تسجيل الخروج
        </button>
      </div>

      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto border-b border-ink-100 pb-px dark:border-ink-800">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition',
                tab === t.id
                  ? 'border-gold-500 text-gold-700 dark:text-gold-400'
                  : 'border-transparent text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100',
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'profile' && <ProfileTab onSaved={refreshProfile} />}
      {tab === 'favorites' && <FavoritesTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'progress' && <ProgressTab />}
    </div>
  )
}

/* ------------------------------- الملف الشخصي ------------------------------- */
function ProfileTab({ onSaved }: { onSaved: () => Promise<void> }) {
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '')
    setBio(profile?.bio ?? '')
    setAvatarUrl(profile?.avatar_url ?? '')
  }, [profile])

  const onPickAvatar = async (file: File) => {
    if (!user) return
    if (!file.type.startsWith('image/')) {
      error('الرجاء اختيار ملف صورة')
      return
    }
    setUploading(true)
    try {
      const res = await uploadFile('avatars', file, { userId: user.id, folder: 'avatar' })
      setAvatarUrl(res.url)
      await supabase.from('profiles').update({ avatar_url: res.url }).eq('id', user.id)
      await onSaved()
      success('تم تحديث الصورة الشخصية')
    } catch (e: any) {
      error(e?.message || 'تعذّر رفع الصورة')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!user) return
    setSaving(true)
    const { error: e } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || null, bio: bio.trim() || null })
      .eq('id', user.id)
    setSaving(false)
    if (e) {
      error('تعذّر حفظ التغييرات')
      return
    }
    await onSaved()
    success('تم حفظ الملف الشخصي')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="card flex flex-col items-center p-6 text-center">
        <div className="relative">
          <Avatar src={avatarUrl} name={displayName} size={112} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -end-1 flex h-9 w-9 items-center justify-center rounded-full bg-gold-500 text-ink-950 shadow-soft transition hover:bg-gold-400 disabled:opacity-60"
            aria-label="تغيير الصورة"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onPickAvatar(f)
              e.target.value = ''
            }}
          />
        </div>
        <p className="mt-4 font-display text-lg font-semibold text-ink-900 dark:text-parchment-100">
          {displayName || 'قارئ'}
        </p>
        <p className="text-xs text-ink-400">{user?.email}</p>
        <span className="chip mt-3">
          <Sparkles className="h-3 w-3" />
          {profile?.role === 'owner' ? 'المالك' : profile?.role === 'staff' ? 'مشرف' : 'قارئ'}
        </span>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink-900 dark:text-parchment-100">
          تعديل البيانات
        </h2>
        <div className="space-y-4">
          <div>
            <label className="label">الاسم الظاهر</label>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="اكتب اسمك"
            />
          </div>
          <div>
            <label className="label">نبذة</label>
            <textarea
              className="input min-h-[110px] resize-y"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="عرّف بنفسك بإيجاز…"
            />
          </div>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ التغييرات
          </button>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------- المفضلة --------------------------------- */
function FavoritesTab() {
  const { user } = useAuth()
  const [novels, setNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let mounted = true
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('favorites')
        .select(
          'novel:novels(*, category:categories(*), chapters:chapters(id, chapter_number, title, slug, is_published, published_at, updated_at, views))',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!mounted) return
      const list = (data ?? [])
        .map((r: any) => r.novel)
        .filter(Boolean)
        .map((n: any) => ({
          ...n,
          chapters: (n.chapters ?? []).slice().sort((a: any, b: any) => a.chapter_number - b.chapter_number),
        }))
      setNovels(list)
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [user])

  if (loading) return <PageLoader />
  if (!novels.length)
    return (
      <EmptyState
        icon={<Heart className="h-6 w-6" />}
        title="لا توجد روايات في المفضلة"
        description="أضف الروايات التي تحبها لتجدها هنا بسهولة."
        action={
          <Link to="/browse" className="btn-gold">
            <BookOpen className="h-4 w-4" /> تصفّح الروايات
          </Link>
        }
      />
    )
  return <NovelGrid novels={novels} />
}

/* ------------------------------- سجل القراءة ------------------------------- */
function HistoryTab() {
  const { user } = useAuth()
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let mounted = true
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('reading_history')
        .select(
          'id, read_at, novel:novels(id, slug, title, cover_url, author_name, language, direction), chapter:chapters(id, title, chapter_number, slug)',
        )
        .eq('user_id', user.id)
        .order('read_at', { ascending: false })
        .limit(60)
      if (!mounted) return
      setRows((data ?? []) as unknown as HistoryRow[])
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [user])

  if (loading) return <PageLoader />
  if (!rows.length)
    return (
      <EmptyState
        icon={<History className="h-6 w-6" />}
        title="سجل القراءة فارغ"
        description="ستظهر هنا الفصول التي تقرأها لتعود إليها بسهولة."
      />
    )

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Link
          key={r.id}
          to={r.novel && r.chapter ? `/novel/${r.novel.slug}/chapter/${r.chapter.slug}` : '#'}
          className="card flex items-center gap-4 p-3 transition hover:border-gold-300 dark:hover:border-gold-700"
        >
          <div className="h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
            {r.novel?.cover_url ? (
              <img src={r.novel.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ink-900 dark:text-parchment-100">
              {r.novel?.title}
            </p>
            <p className="truncate text-sm text-ink-500 dark:text-ink-400">
              {r.chapter ? `فصل ${r.chapter.chapter_number} — ${r.chapter.title}` : '—'}
            </p>
          </div>
          <span className="shrink-0 text-xs text-ink-400">{timeAgo(r.read_at)}</span>
        </Link>
      ))}
    </div>
  )
}

/* ------------------------------ تقدّم القراءة ------------------------------ */
function ProgressTab() {
  const { user } = useAuth()
  const [rows, setRows] = useState<ProgressRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let mounted = true
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('reading_progress')
        .select(
          'novel_id, chapter_id, scroll_percent, updated_at, novel:novels(id, slug, title, cover_url, author_name, language, direction), chapter:chapters(id, title, chapter_number, slug)',
        )
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      if (!mounted) return
      setRows((data ?? []) as unknown as ProgressRow[])
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [user])

  if (loading) return <PageLoader />
  if (!rows.length)
    return (
      <EmptyState
        icon={<Clock className="h-6 w-6" />}
        title="لا يوجد تقدّم محفوظ"
        description="عند بدء القراءة سيُحفظ موضعك تلقائيًا لتكمل من حيث توقفت."
      />
    )

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = Math.round(Number(r.scroll_percent || 0))
        return (
          <div key={r.novel_id} className="card flex items-center gap-4 p-3">
            <div className="h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
              {r.novel?.cover_url ? (
                <img src={r.novel.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink-900 dark:text-parchment-100">
                {r.novel?.title}
              </p>
              <p className="truncate text-sm text-ink-500 dark:text-ink-400">
                {r.chapter ? `فصل ${r.chapter.chapter_number} — ${r.chapter.title}` : '—'}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                <div className="h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-ink-400">
                {pct}% · آخر قراءة {timeAgo(r.updated_at)}
              </p>
            </div>
            {r.novel && r.chapter && (
              <Link
                to={`/novel/${r.novel.slug}/chapter/${r.chapter.slug}`}
                className="btn-gold btn-sm shrink-0"
              >
                متابعة
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
