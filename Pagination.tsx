import { ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (p: number) => void
}) {
  if (totalPages <= 1) return null

  const pages: (number | '…')[] = []
  const push = (p: number | '…') => pages.push(p)
  const window = 1
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - window && i <= page + window)) {
      push(i)
    } else if (pages[pages.length - 1] !== '…') {
      push('…')
    }
  }

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="ترقيم الصفحات">
      <button
        className="btn-outline btn-sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="السابق"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-2 text-ink-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              'btn btn-sm min-w-[2.25rem]',
              p === page
                ? 'bg-ink-900 text-parchment-50 dark:bg-gold-500 dark:text-ink-950'
                : 'btn-outline',
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        className="btn-outline btn-sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="التالي"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    </nav>
  )
}
