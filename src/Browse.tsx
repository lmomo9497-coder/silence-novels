import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X, BookOpen } from 'lucide-react'
import { fetchCategories, fetchNovels } from '../lib/api'
import { useAsync } from '../hooks/useAsync'
import { useDebounce } from '../hooks/useDebounce'
import { NovelGrid } from '../components/novel/NovelCard'
import { Pagination } from '../components/ui/Pagination'
import { EmptyState } from '../components/ui/EmptyState'
import { LANGUAGES, NOVEL_STATUS, PAGE_SIZE, SORT_OPTIONS } from '../lib/constants'
import { cn } from '../lib/utils'

export default function Browse() {
  const [params, setParams] = useSearchParams()
  const categories = useAsync(() => fetchCategories(), [])

  const q = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const language = params.get('language') ?? ''
  const status = params.get('status') ?? ''
  const sort = (params.get('sort') as any) ?? 'latest'
  const page = Number(params.get('page') ?? '1')

  const [searchInput, setSearchInput] = useState(q)
  const debounced = useDebounce(searchInput, 400)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    setSearchInput(q)
  }, [q])

  useEffect(() => {
    if (debounced !== q) {
      update({ q: debounced || null, page: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    })
    if (!('page' in patch)) next.delete('page')
    setParams(next, { replace: true })
  }

  const { data, loading } = useAsync(
    () =>
      fetchNovels({
        search: q,
        categoryId: category || null,
        language: language || null,
        status: status || null,
        sort,
        page,
        pageSize: PAGE_SIZE,
      }),
    [q, category, language, status, sort, page],
  )

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE)),
    [data?.count],
  )

  const activeFilters = [category, language, status].filter(Boolean).length

  return (
    <div className="container-app py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl dark:text-parchment-100">
          تصفّح الروايات
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          {data ? `${data.count} رواية` : 'استكشف جميع الأعمال'}
        </p>
      </div>

      {/* شريط البحث */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 start-3.5" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ابحث بالاسم، الكاتب، أو الوصف…"
            className="input !py-3 ps-10"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute top-1/2 -translate-y-1/2 text-ink-400 end-3"
              aria-label="مسح"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={cn('btn-outline !px-4', activeFilters > 0 && '!border-gold-400 !text-gold-700')}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">الفلاتر</span>
          {activeFilters > 0 && (
            <span className="rounded-full bg-gold-500 px-1.5 text-[10px] text-ink-950">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* الفلاتر */}
      {showFilters && (
        <div className="card mb-6 space-y-4 p-4 animate-fade-in">
          <FilterGroup label="الترتيب">
            {SORT_OPTIONS.map((o) => (
              <Chip key={o.value} active={sort === o.value} onClick={() => update({ sort: o.value })}>
                {o.label}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label="الحالة">
            <Chip active={!status} onClick={() => update({ status: null })}>
              الكل
            </Chip>
            {NOVEL_STATUS.map((s) => (
              <Chip key={s.value} active={status === s.value} onClick={() => update({ status: s.value })}>
                {s.label}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label="اللغة">
            <Chip active={!language} onClick={() => update({ language: null })}>
              الكل
            </Chip>
            {LANGUAGES.map((l) => (
              <Chip key={l.code} active={language === l.code} onClick={() => update({ language: l.code })}>
                {l.label}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label="التصنيف">
            <Chip active={!category} onClick={() => update({ category: null })}>
              الكل
            </Chip>
            {(categories.data ?? []).map((c) => (
              <Chip key={c.id} active={category === c.id} onClick={() => update({ category: c.id })}>
                {c.name_ar}
              </Chip>
            ))}
          </FilterGroup>

          {activeFilters > 0 && (
            <button
              onClick={() => update({ category: null, language: null, status: null })}
              className="btn-ghost btn-sm"
            >
              <X className="h-3.5 w-3.5" /> مسح الفلاتر
            </button>
          )}
        </div>
      )}

      {/* النتائج */}
      {loading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton aspect-[2/3] rounded-xl" />
              <div className="skeleton mt-2.5 h-4 w-4/5 rounded" />
              <div className="skeleton mt-1.5 h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : (data?.novels.length ?? 0) === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-7 w-7" />}
          title="لا توجد نتائج"
          description="جرّب تعديل كلمات البحث أو الفلاتر."
        />
      ) : (
        <>
          <NovelGrid novels={data!.novels} />
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={(p) => update({ page: String(p) })}
          />
        </>
      )}
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button onClick={onClick} className={cn('chip transition', active && 'chip-active')}>
      {children}
    </button>
  )
}
