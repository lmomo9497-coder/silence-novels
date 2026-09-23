import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BookOpen,
  Heart,
  Play,
  Layers,
  Eye,
  Globe,
  Tag as TagIcon,
  Clock,
  CheckCircle2,
  ListOrdered,
  ChevronLeft,
} from 'lucide-react'
import { fetchNovelBySlug, incrementNovelViews } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../hooks/useFavorites'
import { CoverImage } from '../components/novel/CoverImage'
import { PageLoader } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { cn, formatDate, formatNumber, timeAgo } from '../lib/utils'
import { languageLabel, statusLabel } from '../lib/constants'
import type { ReadingProgress } from '../lib/types'

export default function NovelDetail() {
  const { slug = '' } = useParams()
  const { user, isAuthenticated } = useAuth()
  const { isFavorite, toggle } = useFavorites()
  const [progress, setProgress] = useState<ReadingProgress | null>(null)

  const { data: novel, loading } = useAsync(() => fetchNovelBySlug(slug), [slug])

  useEffect(() => {
    if (novel?.id) incrementNovelViews(novel.id)
  }, [novel?.id])

  useEffect(() => {
    if (!user || !novel?.id) return
    supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('novel_id', novel.id)
      .maybeSingle()
      .then(({ data }) => setProgress(data as ReadingProgress | null))
  }, [user, novel?.id])

  const chapters = novel?.chapters ?? []
  const firstChapter = chapters[0]
  const lastChapter = chapters[chapters.length - 1]
  const continueChapter = useMemo(() => {
    if (!progress?.chapter_id) return null
    return chapters.find((c) => c.id === progress.chapter_id) ?? null
  }, [progress, chapters])

  if (loading) return <PageLoader />
  if (!novel)
    return (
      <div className="container-app py-20">
        <EmptyState
          icon={<BookOpen className="h-7 w-7" />}
          title="الرواية غير موجودة"
          description="ربما تم حذفها أو أنها غير منشورة."
          action={
            <Link to="/browse" className="btn-primary">
              تصفّح الروايات
            </Link>
          }
        />
      </div>
    )

  const fav = isFavorite(novel.id)
  const dir = novel.direction

  return (
    <div>
      {/* رأس الرواية */}
      <section className="border-b border-ink-100 bg-gradient-to-b from-parchment-50 to-parchment-100 dark:border-ink-800 dark:from-ink-950 dark:to-ink-900">
        <div className="container-app py-8">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-48">
              <CoverImage src={novel.cover_url} title={novel.title} rounded="rounded-2xl" className="shadow-card" />
            </div>

            <div className="flex-1 text-center sm:text-start" dir={dir}>
              <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    novel.status === 'completed'
                      ? 'bg-sage-100 text-sage-700 dark:bg-sage-500/20 dark:text-sage-300'
                      : 'bg-gold-100 text-gold-700 dark:bg-gold-500/20 dark:text-gold-300',
                  )}
                >
                  {statusLabel(novel.status)}
                </span>
                {novel.category && <span className="chip">{novel.category.name_ar}</span>}
                {!novel.is_published && (
                  <span className="chip !border-red-300 !text-red-600 dark:!border-red-800 dark:!text-red-400">
                    غير منشورة
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl dark:text-parchment-100">
                {novel.title}
              </h1>
              <p className="mt-1 text-ink-600 dark:text-ink-300">بقلم {novel.author_name}</p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-ink-500 sm:justify-start dark:text-ink-400">
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="h-4 w-4" /> {formatNumber(chapters.length)} فصل
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-4 w-4" /> {formatNumber(novel.views)} قراءة
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-4 w-4" /> {languageLabel(novel.language)}
                </span>
                {novel.last_chapter_at && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> آخر تحديث {timeAgo(novel.last_chapter_at)}
                  </span>
                )}
              </div>

              {novel.tags && novel.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                  <TagIcon className="h-3.5 w-3.5 text-ink-400" />
                  {novel.tags.map((t) => (
                    <Link key={t.id} to={`/browse?tag=${t.slug}`} className="chip !py-0.5 !text-[11px]">
                      {t.name}
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {continueChapter ? (
                  <Link
                    to={`/novel/${novel.slug}/chapter/${continueChapter.slug}`}
                    className="btn-gold"
                  >
                    <Play className="h-4 w-4" /> متابعة القراءة
                  </Link>
                ) : firstChapter ? (
                  <Link to={`/novel/${novel.slug}/chapter/${firstChapter.slug}`} className="btn-gold">
                    <BookOpen className="h-4 w-4" /> ابدأ القراءة
                  </Link>
                ) : (
                  <span className="btn-outline cursor-not-allowed opacity-60">لا توجد فصول بعد</span>
                )}

                {isAuthenticated && (
                  <button
                    onClick={() => toggle(novel.id)}
                    className={cn('btn-outline', fav && '!border-red-300 !text-red-600 dark:!border-red-800')}
                  >
                    <Heart className={cn('h-4 w-4', fav && 'fill-current')} />
                    {fav ? 'في المفضلة' : 'أضف للمفضلة'}
                  </button>
                )}
              </div>

              {continueChapter && (
                <p className="mt-3 text-xs text-ink-400">
                  آخر ما قرأت: {continueChapter.title || `فصل ${continueChapter.chapter_number}`}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container-app grid gap-8 py-8 lg:grid-cols-[1fr_320px]">
        {/* الوصف */}
        <div>
          <h2 className="mb-3 font-display text-xl font-bold text-ink-900 dark:text-parchment-100">
            عن الرواية
          </h2>
          <div
            className="prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-ink-700 dark:text-ink-200"
            dir={dir}
          >
            {novel.description || 'لا يوجد وصف بعد.'}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoTile label="الحالة" value={statusLabel(novel.status)} />
            <InfoTile label="اللغة" value={languageLabel(novel.language)} />
            <InfoTile label="الفصول" value={String(chapters.length)} />
            <InfoTile label="أُضيفت" value={formatDate(novel.created_at)} />
          </div>
        </div>

        {/* قائمة الفصول */}
        <aside>
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
              <ListOrdered className="h-4 w-4 text-gold-500" />
              <h2 className="font-display font-semibold text-ink-900 dark:text-parchment-100">
                قائمة الفصول
              </h2>
              <span className="ms-auto text-xs text-ink-400">{chapters.length}</span>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {chapters.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-ink-400">لا توجد فصول منشورة بعد.</p>
              ) : (
                <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                  {chapters.map((c) => {
                    const isCurrent = progress?.chapter_id === c.id
                    return (
                      <li key={c.id}>
                        <Link
                          to={`/novel/${novel.slug}/chapter/${c.slug}`}
                          className={cn(
                            'flex items-center gap-3 px-4 py-3 transition hover:bg-ink-50 dark:hover:bg-ink-800/60',
                            isCurrent && 'bg-gold-50 dark:bg-gold-500/10',
                          )}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-xs font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                            {c.chapter_number}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 text-sm font-medium text-ink-800 dark:text-ink-100">
                              {c.title || `فصل ${c.chapter_number}`}
                            </span>
                            <span className="text-[11px] text-ink-400">
                              {c.published_at ? timeAgo(c.published_at) : 'مسودة'}
                            </span>
                          </span>
                          {isCurrent ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-gold-500" />
                          ) : (
                            <ChevronLeft className="h-4 w-4 shrink-0 text-ink-300" />
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white/60 p-3 dark:border-ink-800 dark:bg-ink-900/40">
      <p className="text-[11px] text-ink-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink-800 dark:text-ink-100">{value}</p>
    </div>
  )
}
