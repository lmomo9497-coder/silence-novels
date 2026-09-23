import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Search, Sparkles, TrendingUp, Clock, CheckCircle2, BookOpen, Layers } from 'lucide-react'
import { fetchCategories, fetchLatestChapters, fetchNovels } from '../lib/api'
import { useAsync } from '../hooks/useAsync'
import { SectionHeader, NovelRow, NovelSkeletonRow } from '../components/novel/Section'
import { NovelGrid } from '../components/novel/NovelCard'
import { CoverImage } from '../components/novel/CoverImage'
import { SITE } from '../lib/constants'
import { formatNumber, timeAgo } from '../lib/utils'

export default function Home() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const latest = useAsync(() => fetchNovels({ sort: 'latest', pageSize: 12 }), [])
  const mostRead = useAsync(() => fetchNovels({ sort: 'views', pageSize: 12 }), [])
  const updated = useAsync(() => fetchNovels({ sort: 'updated', pageSize: 12 }), [])
  const completed = useAsync(() => fetchNovels({ status: 'completed', pageSize: 12 }), [])
  const ongoing = useAsync(() => fetchNovels({ status: 'ongoing', pageSize: 12 }), [])
  const chapters = useAsync(() => fetchLatestChapters(10), [])
  const categories = useAsync(() => fetchCategories(), [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/browse?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-100 bg-gradient-to-b from-parchment-50 to-parchment-100 dark:border-ink-800 dark:from-ink-950 dark:to-ink-900">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]">
          <div className="absolute -start-20 -top-20 h-72 w-72 rounded-full bg-gold-500 blur-3xl" />
          <div className="absolute -bottom-24 end-0 h-72 w-72 rounded-full bg-sage-500 blur-3xl" />
        </div>
        <div className="container-app relative py-14 text-center sm:py-20">
          <span className="chip mx-auto mb-4 !bg-gold-100 !text-gold-700 dark:!bg-gold-500/15 dark:!text-gold-300">
            <Sparkles className="h-3.5 w-3.5" /> منصة الروايات الأدبية
          </span>
          <h1 className="font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl dark:text-parchment-100">
            {SITE.nameAr}
          </h1>
          <p className="mt-1 text-sm tracking-[0.35em] text-gold-600 dark:text-gold-400">
            {SITE.nameEn.toUpperCase()}
          </p>
          <p className="mx-auto mt-4 max-w-xl text-balance text-ink-600 dark:text-ink-300">
            {SITE.tagline}. فصول غنية بالنصوص والصور والأصوات، بتجربة قراءة مريحة على كل الأجهزة.
          </p>

          <form onSubmit={submit} className="mx-auto mt-7 flex max-w-lg gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 start-3.5" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث عن رواية، كاتب، أو تصنيف…"
                className="input !py-3 ps-10"
                aria-label="بحث"
              />
            </div>
            <button type="submit" className="btn-gold !px-5">
              بحث
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link to="/browse" className="btn-outline btn-sm">
              <BookOpen className="h-3.5 w-3.5" /> تصفّح الكل
            </Link>
            <Link to="/dashboard/novels/new" className="btn-outline btn-sm">
              <Layers className="h-3.5 w-3.5" /> انشر روايتك
            </Link>
          </div>
        </div>
      </section>

      <div className="container-app space-y-12 py-10">
        {/* أحدث الروايات */}
        <section>
          <SectionHeader title="أحدث الروايات" subtitle="أضيفت حديثًا إلى المنصة" moreHref="/browse?sort=latest" />
          {latest.loading ? <NovelSkeletonRow /> : <NovelRow novels={latest.data?.novels ?? []} />}
        </section>

        {/* أحدث الفصول */}
        <section>
          <SectionHeader title="أحدث الفصول" subtitle="آخر ما نُشر من فصول" />
          {chapters.loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(chapters.data ?? []).map((c) => (
                <Link
                  key={c.id}
                  to={`/novel/${c.novel?.slug}/chapter/${c.slug}`}
                  className="card group flex items-center gap-3 p-3 transition hover:border-gold-300 dark:hover:border-gold-700"
                >
                  <div className="w-12 shrink-0">
                    <CoverImage src={c.novel?.cover_url} title={c.novel?.title ?? ''} rounded="rounded-lg" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-ink-900 group-hover:text-gold-700 dark:text-parchment-100 dark:group-hover:text-gold-400">
                      {c.title || `فصل ${c.chapter_number}`}
                    </p>
                    <p className="line-clamp-1 text-xs text-ink-500 dark:text-ink-400">
                      {c.novel?.title} · {c.novel?.author_name}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-ink-400">
                      <Clock className="h-3 w-3" /> {timeAgo(c.published_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* الأكثر قراءة */}
        <section>
          <SectionHeader
            title="الأكثر قراءة"
            subtitle="الأعمال الأكثر شعبية"
            moreHref="/browse?sort=views"
          />
          {mostRead.loading ? <NovelSkeletonRow /> : <NovelRow novels={mostRead.data?.novels ?? []} />}
        </section>

        {/* الأكثر تحديثًا */}
        <section>
          <SectionHeader
            title="الأكثر تحديثًا"
            subtitle="روايات تُحدَّث بانتظام"
            moreHref="/browse?sort=updated"
          />
          {updated.loading ? <NovelSkeletonRow /> : <NovelRow novels={updated.data?.novels ?? []} />}
        </section>

        {/* التصنيفات */}
        <section>
          <SectionHeader title="التصنيفات" subtitle="استكشف حسب النوع" moreHref="/categories" />
          <div className="flex flex-wrap gap-2">
            {(categories.data ?? []).map((c) => (
              <Link
                key={c.id}
                to={`/browse?category=${c.id}`}
                className="chip transition hover:border-gold-400 hover:text-gold-700 dark:hover:text-gold-300"
              >
                {c.name_ar}
              </Link>
            ))}
          </div>
        </section>

        {/* المكتملة */}
        <section>
          <SectionHeader
            title="روايات مكتملة"
            subtitle="اقرأها كاملة دون انتظار"
            moreHref="/browse?status=completed"
          />
          {completed.loading ? <NovelSkeletonRow /> : <NovelRow novels={completed.data?.novels ?? []} />}
        </section>

        {/* المستمرة */}
        <section>
          <SectionHeader
            title="روايات مستمرة"
            subtitle="فصول جديدة قادمة"
            moreHref="/browse?status=ongoing"
          />
          {ongoing.loading ? <NovelSkeletonRow /> : <NovelRow novels={ongoing.data?.novels ?? []} />}
        </section>

        {/* جميع الروايات */}
        <section>
          <SectionHeader title="جميع الروايات" moreHref="/browse" />
          {latest.loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i}>
                  <div className="skeleton aspect-[2/3] rounded-xl" />
                  <div className="skeleton mt-2.5 h-4 w-4/5 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <NovelGrid novels={(latest.data?.novels ?? []).slice(0, 12)} />
          )}
        </section>
      </div>
    </div>
  )
}
