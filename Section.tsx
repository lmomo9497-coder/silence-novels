import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { Novel } from '../../lib/types'
import { NovelCard } from './NovelCard'

export function SectionHeader({
  title,
  subtitle,
  moreHref,
  moreLabel = 'عرض الكل',
}: {
  title: string
  subtitle?: string
  moreHref?: string
  moreLabel?: string
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-bold text-ink-900 sm:text-2xl dark:text-parchment-100">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
      </div>
      {moreHref && (
        <Link
          to={moreHref}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-gold-600 hover:underline dark:text-gold-400"
        >
          {moreLabel}
          <ChevronLeft className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}

export function NovelRow({ novels }: { novels: Novel[] }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      {novels.map((n) => (
        <div key={n.id} className="w-[150px] shrink-0 snap-start sm:w-[168px]">
          <NovelCard novel={n} />
        </div>
      ))}
    </div>
  )
}

export function NovelSkeletonRow({ count = 6 }: { count?: number }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[150px] shrink-0 sm:w-[168px]">
          <div className="skeleton aspect-[2/3] rounded-xl" />
          <div className="skeleton mt-2.5 h-4 w-4/5 rounded" />
          <div className="skeleton mt-1.5 h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  )
}
