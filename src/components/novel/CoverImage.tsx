import { useState } from 'react'
import { cn } from '../../lib/utils'

/**
 * غلاف الرواية. إذا لم يوجد غلاف نعرض Placeholder محايدًا من تصميم الموقع
 * (لا نجلب أي صورة من الإنترنت).
 */
export function CoverImage({
  src,
  title,
  className,
  rounded = 'rounded-xl',
}: {
  src?: string | null
  title: string
  className?: string
  rounded?: string
}) {
  const [failed, setFailed] = useState(false)
  const showPlaceholder = !src || failed

  return (
    <div
      className={cn(
        'relative aspect-[2/3] w-full overflow-hidden bg-ink-100 dark:bg-ink-800',
        rounded,
        className,
      )}
    >
      {showPlaceholder ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 p-3 text-center">
          <svg viewBox="0 0 64 64" className="mb-2 h-10 w-10 opacity-80" aria-hidden="true">
            <path
              d="M32 14c-6-3.5-13-4-18-3v34c5-1 12-.5 18 3 6-3.5 13-4 18-3V11c-5-1-12-.5-18 3z"
              fill="none"
              stroke="#d4a94f"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path d="M32 14v34" stroke="#d4a94f" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <span className="line-clamp-3 font-display text-xs font-semibold leading-snug text-parchment-200/90">
            {title}
          </span>
          <span className="mt-1 text-[9px] tracking-[0.2em] text-gold-500/80">SILENCE NOVELS</span>
        </div>
      ) : (
        <img
          src={src!}
          alt={title}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
    </div>
  )
}
