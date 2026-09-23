import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronRight,
  ChevronLeft,
  List,
  Settings2,
  X,
  BookOpen,
  Minus,
  Plus,
  Sun,
  Moon,
  Home,
  Check,
} from 'lucide-react'
import {
  fetchBlocks,
  fetchChapterBySlug,
  fetchChapters,
  fetchNovelBySlug,
  incrementChapterViews,
} from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useReadingSettings } from '../context/ReadingSettingsContext'
import { BlockRenderer } from '../components/reader/BlockRenderer'
import { PageLoader } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { READING_FONTS } from '../lib/constants'
import { cn, clamp } from '../lib/utils'

export default function ChapterReader() {
  const { slug = '', chapterSlug = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const settings = useReadingSettings()

  const [showChapters, setShowChapters] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [progressPct, setProgressPct] = useState(0)
  const savedRef = useRef(0)
  const historyLogged = useRef<string | null>(null)

  const novelQ = useAsync(() => fetchNovelBySlug(slug), [slug])
  const chapterQ = useAsync(
    () => (novelQ.data ? fetchChapterBySlug(novelQ.data.id, chapterSlug) : Promise.resolve(null)),
    [novelQ.data?.id, chapterSlug],
  )
  const blocksQ = useAsync(
    () => (chapterQ.data ? fetchBlocks(chapterQ.data.id) : Promise.resolve([])),
    [chapterQ.data?.id],
  )
  const chaptersQ = useAsync(
    () => (novelQ.data ? fetchChapters(novelQ.data.id) : Promise.resolve([])),
    [novelQ.data?.id],
  )

  const novel = novelQ.data
  const chapter = chapterQ.data
  const blocks = blocksQ.data ?? []
  const chapters = chaptersQ.data ?? []

  const idx = useMemo(
    () => chapters.findIndex((c) => c.id === chapter?.id),
    [chapters, chapter?.id],
  )
  const prev = idx > 0 ? chapters[idx - 1] : null
  const next = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null

  // عدّاد المشاهدات + سجل القراءة
  useEffect(() => {
    if (!chapter?.id) return
    incrementChapterViews(chapter.id)
    if (user && historyLogged.current !== chapter.id) {
      historyLogged.current = chapter.id
      supabase
        .from('reading_history')
        .insert({ user_id: user.id, novel_id: chapter.novel_id, chapter_id: chapter.id })
        .then(() => {})
    }
  }, [chapter?.id, user])

  // حفظ موضع القراءة
  const saveProgress = useCallback(
    (pct: number) => {
      if (!user || !chapter) return
      supabase
        .from('reading_progress')
        .upsert(
          {
            user_id: user.id,
            novel_id: chapter.novel_id,
            chapter_id: chapter.id,
            scroll_percent: pct,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,novel_id' },
        )
        .then(() => {})
    },
    [user, chapter],
  )

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement
      const total = h.scrollHeight - h.clientHeight
      const pct = total > 0 ? clamp((h.scrollTop / total) * 100, 0, 100) : 0
      setProgressPct(pct)
      if (Math.abs(pct - savedRef.current) > 8) {
        savedRef.current = pct
        saveProgress(pct)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [saveProgress])

  // حفظ عند المغادرة
  useEffect(() => {
    return () => {
      if (savedRef.current > 0) saveProgress(savedRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // التنقل بالأسهم
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowLeft' && next) navigate(`/novel/${slug}/chapter/${next.slug}`)
      if (e.key === 'ArrowRight' && prev) navigate(`/novel/${slug}/chapter/${prev.slug}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, navigate, slug])

  if (novelQ.loading || chapterQ.loading) return <PageLoader label="جارٍ تحضير الفصل…" />

  if (!novel || !chapter)
    return (
      <div className="container-app py-20">
        <EmptyState
          icon={<BookOpen className="h-7 w-7" />}
          title="الفصل غير متاح"
          description="ربما لم يُنشر هذا الفصل بعد أو تم حذفه."
          action={
            <Link to={`/novel/${slug}`} className="btn-primary">
              العودة للرواية
            </Link>
          }
        />
      </div>
    )

  const dir = novel.direction
  const widthClass =
    settings.width === 'narrow' ? 'max-w-reading' : settings.width === 'wide' ? 'max-w-3xl' : 'max-w-2xl'

  return (
    <div dir={dir}>
      {/* شريط التقدم */}
      <div className="fixed inset-x-0 top-16 z-40 h-0.5 bg-transparent">
        <div className="h-full bg-gold-500 transition-[width] duration-150" style={{ width: `${progressPct}%` }} />
      </div>

      {/* شريط أدوات علوي */}
      <div className="sticky top-16 z-30 border-b border-ink-100 bg-parchment-50/90 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90">
        <div className="container-app flex h-12 items-center gap-2">
          <Link to={`/novel/${novel.slug}`} className="btn-ghost btn-sm !px-2" aria-label="الرواية">
            <Home className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="line-clamp-1 text-xs font-medium text-ink-600 dark:text-ink-300">
              {novel.title}
            </p>
          </div>
          <button onClick={() => setShowChapters(true)} className="btn-ghost btn-sm !px-2" aria-label="الفصول">
            <List className="h-4 w-4" />
          </button>
          <button onClick={() => setShowSettings(true)} className="btn-ghost btn-sm !px-2" aria-label="الإعدادات">
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <article className="container-app py-8">
        <header className={cn('mx-auto mb-8 text-center', widthClass)}>
          <p className="text-xs font-medium uppercase tracking-widest text-gold-600 dark:text-gold-400">
            الفصل {chapter.chapter_number}
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink-900 sm:text-3xl dark:text-parchment-100">
            {chapter.title || `فصل ${chapter.chapter_number}`}
          </h1>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">{novel.title}</p>
        </header>

        <div className={cn('mx-auto', widthClass)}>
          {blocksQ.loading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-5 w-full rounded" />
              ))}
            </div>
          ) : blocks.length === 0 ? (
            <p className="py-10 text-center text-ink-400">لا يوجد محتوى في هذا الفصل بعد.</p>
          ) : (
            blocks.map((b) => <BlockRenderer key={b.id} block={b} />)
          )}
        </div>

        {/* التنقل */}
        <nav className={cn('mx-auto mt-12 flex items-center justify-between gap-3', widthClass)}>
          {prev ? (
            <Link to={`/novel/${slug}/chapter/${prev.slug}`} className="btn-outline flex-1 !justify-start">
              <ChevronRight className="h-4 w-4" />
              <span className="min-w-0">
                <span className="block text-[10px] text-ink-400">السابق</span>
                <span className="line-clamp-1 text-xs">{prev.title || `فصل ${prev.chapter_number}`}</span>
              </span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {next ? (
            <Link to={`/novel/${slug}/chapter/${next.slug}`} className="btn-gold flex-1 !justify-end">
              <span className="min-w-0 text-end">
                <span className="block text-[10px] opacity-70">التالي</span>
                <span className="line-clamp-1 text-xs">{next.title || `فصل ${next.chapter_number}`}</span>
              </span>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : (
            <Link to={`/novel/${slug}`} className="btn-outline flex-1 !justify-end">
              <span className="text-xs">العودة للرواية</span>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          )}
        </nav>
      </article>

      {/* درج الفصول */}
      {showChapters && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setShowChapters(false)} />
          <div className="absolute inset-y-0 end-0 flex w-full max-w-sm flex-col bg-white shadow-card animate-fade-in dark:bg-ink-900">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
              <h2 className="font-display font-semibold text-ink-900 dark:text-parchment-100">الفصول</h2>
              <button onClick={() => setShowChapters(false)} className="btn-ghost btn-sm !p-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chapters.map((c) => (
                <Link
                  key={c.id}
                  to={`/novel/${slug}/chapter/${c.slug}`}
                  onClick={() => setShowChapters(false)}
                  className={cn(
                    'flex items-center gap-3 border-b border-ink-50 px-4 py-3 transition hover:bg-ink-50 dark:border-ink-800/60 dark:hover:bg-ink-800/60',
                    c.id === chapter.id && 'bg-gold-50 dark:bg-gold-500/10',
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-xs font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                    {c.chapter_number}
                  </span>
                  <span className="line-clamp-1 flex-1 text-sm text-ink-700 dark:text-ink-200">
                    {c.title || `فصل ${c.chapter_number}`}
                  </span>
                  {c.id === chapter.id && <Check className="h-4 w-4 text-gold-500" />}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* لوحة الإعدادات */}
      {showSettings && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-2xl bg-white p-5 shadow-card animate-fade-in sm:inset-y-0 sm:end-0 sm:my-auto sm:h-fit sm:rounded-2xl dark:bg-ink-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display font-semibold text-ink-900 dark:text-parchment-100">
                إعدادات القراءة
              </h2>
              <button onClick={() => setShowSettings(false)} className="btn-ghost btn-sm !p-2">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="label">حجم الخط</label>
                <div className="flex items-center gap-3">
                  <button className="btn-outline btn-sm !p-2" onClick={() => settings.update({ fontSize: clamp(settings.fontSize - 2, 14, 34) })}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="flex-1 text-center text-sm font-medium tabular-nums">{settings.fontSize}px</span>
                  <button className="btn-outline btn-sm !p-2" onClick={() => settings.update({ fontSize: clamp(settings.fontSize + 2, 14, 34) })}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="label">تباعد الأسطر</label>
                <input
                  type="range"
                  min={1.4}
                  max={2.8}
                  step={0.1}
                  value={settings.lineHeight}
                  onChange={(e) => settings.update({ lineHeight: Number(e.target.value) })}
                  className="w-full accent-gold-500"
                />
              </div>

              <div>
                <label className="label">نوع الخط</label>
                <div className="flex flex-wrap gap-2">
                  {READING_FONTS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => settings.update({ font: f.value })}
                      className={cn('chip', settings.font === f.value && 'chip-active')}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">عرض المحتوى</label>
                <div className="flex gap-2">
                  {(['narrow', 'normal', 'wide'] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => settings.update({ width: w })}
                      className={cn('chip flex-1 justify-center', settings.width === w && 'chip-active')}
                    >
                      {w === 'narrow' ? 'ضيّق' : w === 'normal' ? 'متوسط' : 'واسع'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">المظهر</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTheme('light')}
                    className={cn('chip flex-1 justify-center', theme === 'light' && 'chip-active')}
                  >
                    <Sun className="h-4 w-4" /> فاتح
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={cn('chip flex-1 justify-center', theme === 'dark' && 'chip-active')}
                  >
                    <Moon className="h-4 w-4" /> داكن
                  </button>
                </div>
              </div>

              <button onClick={settings.reset} className="btn-ghost btn-sm w-full">
                إعادة الإعدادات الافتراضية
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
