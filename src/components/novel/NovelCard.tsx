import { Link } from 'react-router-dom'
import { BookOpen, Heart, Layers, Clock } from 'lucide-react'
import type { Novel } from '../../lib/types'
import { CoverImage } from './CoverImage'
import { cn, formatNumber, timeAgo } from '../../lib/utils'
import { statusLabel } from '../../lib/constants'
import { useAuth } from '../../context/AuthContext'
import { useFavorites } from '../../hooks/useFavorites'

export function NovelCard({ novel, className }: { novel: Novel; className?: string }) {
  const { isAuthenticated } = useAuth()
  const { isFavorite, toggle } = useFavorites()
  const fav = isFavorite(novel.id)
  const chapterCount = novel.chapters?.length ?? 0
  const lastChapter = novel.chapters?.[novel.chapters.length - 1]

  return (
    <div className={cn('group relative flex flex-col', className)}>
      <Link to={`/novel/${novel.slug}`} className="block">
        <div className="relative overflow-hidden rounded-xl shadow-soft ring-1 ring-ink-900/5 dark:ring-ink-700/50">
          <CoverImage src={novel.cover_url} title={novel.title} rounded="rounded-xl" />
          <span
            className={cn(
              'absolute top-2 start-2 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur',
              novel.status === 'completed'
                ? 'bg-sage-500/90 text-white'
                : 'bg-gold-500/90 text-ink-950',
            )}
          >
            {statusLabel(novel.status)}
          </span>
        </div>
      </Link>

      {isAuthenticated && (
        <button
          onClick={(e) => {
            e.preventDefault()
            toggle(novel.id)
          }}
          aria-label={fav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          className={cn(
            'absolute top-2 end-2 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition',
            fav
              ? 'bg-red-500/90 text-white'
              : 'bg-ink-950/40 text-white/90 hover:bg-ink-950/70',
          )}
        >
          <Heart className={cn('h-4 w-4', fav && 'fill-current')} />
        </button>
      )}

      <div className="mt-2.5 flex flex-1 flex-col">
        <Link to={`/novel/${novel.slug}`}>
          <h3 className="line-clamp-2 font-display text-sm font-semibold leading-snug text-ink-900 transition group-hover:text-gold-700 dark:text-parchment-100 dark:group-hover:text-gold-400">
            {novel.title}
          </h3>
        </Link>
        <p className="mt-0.5 line-clamp-1 text-xs text-ink-500 dark:text-ink-400">
          {novel.author_name}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-400 dark:text-ink-500">
          {novel.category && (
            <span className="chip !px-2 !py-0.5 !text-[10px]">{novel.category.name_ar}</span>
          )}
          <span className="inline-flex items-center gap-1">
            <Layers className="h-3 w-3" /> {formatNumber(chapterCount)} فصل
          </span>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" /> {formatNumber(novel.views)}
          </span>
        </div>

        {lastChapter && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-ink-400 dark:text-ink-500">
            <Clock className="h-3 w-3" />
            آخر فصل: {lastChapter.title || `فصل ${lastChapter.chapter_number}`} ·{' '}
            {timeAgo(lastChapter.published_at || lastChapter.updated_at)}
          </p>
        )}

        <Link
          to={`/novel/${novel.slug}`}
          className="btn-gold btn-sm mt-3 w-full"
        >
          <BookOpen className="h-3.5 w-3.5" /> اقرأ الآن
        </Link>
      </div>
    </div>
  )
}

export function NovelGrid({ novels }: { novels: Novel[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {novels.map((n) => (
        <NovelCard key={n.id} novel={n} />
      ))}
    </div>
  )
}
