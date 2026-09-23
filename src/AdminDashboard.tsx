import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Eye,
  FileText,
  Flag,
  Image as ImageIcon,
  Layers,
  ShieldCheck,
  Tags,
  TrendingUp,
  Users,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { PageLoader } from '../../components/ui/Spinner'
import { CoverImage } from '../../components/novel/CoverImage'
import { cn, formatNumber, timeAgo } from '../../lib/utils'
import { statusLabel } from '../../lib/constants'
import type { Novel } from '../../lib/types'

interface Stats {
  novels: number
  publishedNovels: number
  chapters: number
  publishedChapters: number
  users: number
  media: number
  audio: number
  views: number
  flagged: number
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    novels: 0,
    publishedNovels: 0,
    chapters: 0,
    publishedChapters: 0,
    users: 0,
    media: 0,
    audio: 0,
    views: 0,
    flagged: 0,
  })
  const [recent, setRecent] = useState<Novel[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const [
      novels,
      publishedNovels,
      chapters,
      publishedChapters,
      users,
      media,
      audio,
      flagged,
      viewsData,
      recentData,
    ] = await Promise.all([
      supabase.from('novels').select('id', { count: 'exact', head: true }),
      supabase.from('novels').select('id', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('chapters').select('id', { count: 'exact', head: true }),
      supabase.from('chapters').select('id', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('media').select('id', { count: 'exact', head: true }),
      supabase.from('audio_tracks').select('id', { count: 'exact', head: true }),
      supabase.from('novels').select('id', { count: 'exact', head: true }).eq('is_flagged', true),
      supabase.from('novels').select('views'),
      supabase
        .from('novels')
        .select('*, category:categories(*), chapters:chapters(id, chapter_number, title, slug, is_published, published_at, updated_at, views)')
        .order('updated_at', { ascending: false })
        .limit(6),
    ])
    const totalViews = (viewsData.data ?? []).reduce((s: number, r: any) => s + Number(r.views || 0), 0)
    setStats({
      novels: novels.count ?? 0,
      publishedNovels: publishedNovels.count ?? 0,
      chapters: chapters.count ?? 0,
      publishedChapters: publishedChapters.count ?? 0,
      users: users.count ?? 0,
      media: media.count ?? 0,
      audio: audio.count ?? 0,
      views: totalViews,
      flagged: flagged.count ?? 0,
    })
    setRecent((recentData.data ?? []) as unknown as Novel[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <PageLoader />

  const cards = [
    { label: 'الروايات', value: stats.novels, sub: `${stats.publishedNovels} منشورة`, icon: BookOpen, tone: 'gold' },
    { label: 'الفصول', value: stats.chapters, sub: `${stats.publishedChapters} منشور`, icon: FileText, tone: 'sage' },
    { label: 'المستخدمون', value: stats.users, sub: 'حساب مسجّل', icon: Users, tone: 'ink' },
    { label: 'المشاهدات', value: stats.views, sub: 'إجمالي', icon: Eye, tone: 'gold' },
    { label: 'الوسائط', value: stats.media, sub: 'صورة/GIF', icon: ImageIcon, tone: 'sage' },
    { label: 'المقاطع الصوتية', value: stats.audio, sub: 'ملف صوتي', icon: Layers, tone: 'ink' },
  ]

  const toneClass: Record<string, string> = {
    gold: 'bg-gold-100 text-gold-600 dark:bg-gold-500/15 dark:text-gold-400',
    sage: 'bg-sage-100 text-sage-700 dark:bg-sage-500/15 dark:text-sage-300',
    ink: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  }

  return (
    <div className="container-app py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-100 text-gold-600 dark:bg-gold-500/15 dark:text-gold-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900 dark:text-parchment-100">
            لوحة الإدارة
          </h1>
          <p className="text-xs text-ink-400">
            مرحبًا {profile?.display_name || 'بك'} — نظرة عامة على المنصة
          </p>
        </div>
        <div className="ms-auto flex flex-wrap gap-2">
          <Link to="/admin/users" className="btn-outline btn-sm">
            <Users className="h-4 w-4" /> المستخدمون
          </Link>
          <Link to="/admin/categories" className="btn-outline btn-sm">
            <Tags className="h-4 w-4" /> التصنيفات
          </Link>
          <Link to="/admin/moderation" className="btn-outline btn-sm">
            <Flag className="h-4 w-4" /> الإشراف
          </Link>
        </div>
      </div>

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="card p-4">
              <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl', toneClass[c.tone])}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-display text-2xl font-bold text-ink-900 dark:text-parchment-100">
                {formatNumber(c.value)}
              </p>
              <p className="text-xs font-medium text-ink-600 dark:text-ink-300">{c.label}</p>
              <p className="text-[11px] text-ink-400">{c.sub}</p>
            </div>
          )
        })}
      </div>

      {/* تنبيه الإشراف */}
      {stats.flagged > 0 && (
        <Link
          to="/admin/moderation"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <Flag className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">
            يوجد {stats.flagged} رواية مُعلّمة للمراجعة. اضغط للانتقال إلى صفحة الإشراف.
          </span>
        </Link>
      )}

      {/* أحدث الروايات */}
      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-gold-500" />
          <h2 className="font-display text-lg font-bold text-ink-900 dark:text-parchment-100">
            أحدث الروايات
          </h2>
        </div>
        {recent.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((n) => (
              <Link
                key={n.id}
                to={`/dashboard/novels/${n.id}`}
                className="card flex gap-3 p-3 transition hover:border-gold-300"
              >
                <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg">
                  <CoverImage src={n.cover_url} title={n.title} className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-800 dark:text-ink-100">{n.title}</p>
                  <p className="truncate text-xs text-ink-400">{n.author_name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px]',
                        n.is_published
                          ? 'bg-sage-100 text-sage-700 dark:bg-sage-500/15 dark:text-sage-300'
                          : 'bg-ink-100 text-ink-500 dark:bg-ink-800',
                      )}
                    >
                      {n.is_published ? 'منشورة' : 'مسودة'}
                    </span>
                    <span className="text-[10px] text-ink-400">{statusLabel(n.status)}</span>
                    <span className="text-[10px] text-ink-400">· {timeAgo(n.updated_at)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-400">لا توجد روايات بعد.</p>
        )}
      </div>
    </div>
  )
}
