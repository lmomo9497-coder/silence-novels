import { Link } from 'react-router-dom'
import { Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { fetchCategories } from '../lib/api'
import { useAsync } from '../hooks/useAsync'

async function fetchCounts(): Promise<Record<string, number>> {
  const { data } = await supabase.from('novels').select('category_id').eq('is_published', true)
  const counts: Record<string, number> = {}
  ;(data ?? []).forEach((r: any) => {
    if (r.category_id) counts[r.category_id] = (counts[r.category_id] ?? 0) + 1
  })
  return counts
}

export default function Categories() {
  const categories = useAsync(() => fetchCategories(), [])
  const counts = useAsync(() => fetchCounts(), [])

  return (
    <div className="container-app py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl dark:text-parchment-100">
          التصنيفات
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          اختر نوعًا واستكشف الروايات المناسبة لك
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {(categories.data ?? []).map((c) => (
          <Link
            key={c.id}
            to={`/browse?category=${c.id}`}
            className="card group flex items-center justify-between gap-3 p-4 transition hover:border-gold-300 hover:shadow-card dark:hover:border-gold-700"
          >
            <div className="min-w-0">
              <p className="truncate font-display font-semibold text-ink-900 group-hover:text-gold-700 dark:text-parchment-100 dark:group-hover:text-gold-400">
                {c.name_ar}
              </p>
              <p className="truncate text-xs text-ink-400">{c.name_en}</p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-xs font-semibold text-gold-700 dark:bg-gold-500/15 dark:text-gold-300">
              {counts.data?.[c.id] ?? 0}
            </span>
          </Link>
        ))}
      </div>

      {categories.loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      )}

      {!categories.loading && (categories.data?.length ?? 0) === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-ink-400">
          <Layers className="h-8 w-8" />
          <p>لا توجد تصنيفات بعد.</p>
        </div>
      )}
    </div>
  )
}
