import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  EyeOff,
  Flag,
  Loader2,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { PageLoader } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { CoverImage } from '../../components/novel/CoverImage'
import { cn, formatDate, moderateText, stripHtml } from '../../lib/utils'
import type { Novel } from '../../lib/types'

interface ScanResult {
  novel: Novel
  matches: string[]
  sources: string[]
}

export default function AdminModeration() {
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [flagged, setFlagged] = useState<Novel[]>([])
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<ScanResult[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Novel | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('novels')
      .select('*, category:categories(*), chapters:chapters(id, chapter_number, title, slug, is_published, published_at, updated_at, views)')
      .eq('is_flagged', true)
      .order('updated_at', { ascending: false })
    setFlagged((data ?? []) as unknown as Novel[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /* فحص المحتوى: يمرّ على كل الروايات والفصول بحثًا عن أنماط ممنوعة */
  const runScan = async () => {
    setScanning(true)
    setResults(null)
    try {
      const { data: novels } = await supabase
        .from('novels')
        .select('*, category:categories(*), chapters:chapters(id, chapter_number, title, slug, is_published, published_at, updated_at, views)')
      const list = (novels ?? []) as unknown as Novel[]
      const out: ScanResult[] = []
      for (const n of list) {
        const matches = new Set<string>()
        const sources = new Set<string>()
        const check = (text: string | null | undefined, source: string) => {
          if (!text) return
          const r = moderateText(text)
          if (r.flagged) {
            r.matches.forEach((m) => matches.add(m))
            sources.add(source)
          }
        }
        check(n.title, 'العنوان')
        check(n.description, 'الوصف')
        // فحص محتوى الفصول
        const chapterIds = (n.chapters ?? []).map((c) => c.id)
        if (chapterIds.length) {
          const { data: blocks } = await supabase
            .from('chapter_blocks')
            .select('chapter_id, type, content')
            .in('chapter_id', chapterIds)
          for (const b of (blocks ?? []) as any[]) {
            if (b.type === 'text' || b.type === 'quote' || b.type === 'heading') {
              check(stripHtml(b.content), 'محتوى الفصل')
            }
          }
        }
        if (matches.size) {
          out.push({ novel: n, matches: Array.from(matches), sources: Array.from(sources) })
        }
      }
      setResults(out)
      success(out.length ? `تم العثور على ${out.length} رواية تحتاج مراجعة` : 'لا يوجد محتوى مخالف — المنصة نظيفة')
    } catch (err: any) {
      error(err?.message || 'تعذّر إكمال الفحص')
    } finally {
      setScanning(false)
    }
  }

  const unflag = async (novel: Novel) => {
    setBusyId(novel.id)
    const { error: e } = await supabase.from('novels').update({ is_flagged: false }).eq('id', novel.id)
    setBusyId(null)
    if (e) {
      error('تعذّر تحديث الحالة')
      return
    }
    setFlagged((f) => f.filter((n) => n.id !== novel.id))
    success('تم اعتماد الرواية وإزالة العلامة')
  }

  const unpublish = async (novel: Novel) => {
    setBusyId(novel.id)
    const { error: e } = await supabase
      .from('novels')
      .update({ is_published: false, is_flagged: false })
      .eq('id', novel.id)
    setBusyId(null)
    if (e) {
      error('تعذّر إلغاء النشر')
      return
    }
    setFlagged((f) => f.filter((n) => n.id !== novel.id))
    success('تم إلغاء نشر الرواية')
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    const { error: e } = await supabase.from('novels').delete().eq('id', toDelete.id)
    setDeleting(false)
    if (e) {
      error('تعذّر حذف الرواية')
      return
    }
    setFlagged((f) => f.filter((n) => n.id !== toDelete.id))
    setResults((r) => (r ? r.filter((x) => x.novel.id !== toDelete.id) : r))
    success('تم حذف الرواية')
    setToDelete(null)
  }

  if (loading) return <PageLoader />

  return (
    <div className="container-app py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900 dark:text-parchment-100">
            الإشراف على المحتوى
          </h1>
          <p className="text-xs text-ink-400">
            المنصة مخصّصة للمحتوى النظيف والمحترم — لا محتوى إباحي أو مسيء.
          </p>
        </div>
        <button className="btn-gold btn-sm ms-auto" onClick={runScan} disabled={scanning}>
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
          فحص المحتوى
        </button>
      </div>

      {/* نتائج الفحص */}
      {results && (
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <ScanSearch className="h-5 w-5 text-gold-500" />
            <h2 className="font-display text-lg font-bold text-ink-900 dark:text-parchment-100">
              نتائج الفحص ({results.length})
            </h2>
            <button className="btn-ghost btn-sm ms-auto" onClick={() => setResults(null)}>
              إخفاء
            </button>
          </div>
          {results.length ? (
            <div className="space-y-3">
              {results.map((r) => (
                <div
                  key={r.novel.id}
                  className="card flex flex-wrap items-center gap-3 border-amber-200 p-4 dark:border-amber-500/30"
                >
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/novel/${r.novel.slug}`}
                      className="font-medium text-ink-800 hover:text-gold-600 dark:text-ink-100"
                    >
                      {r.novel.title}
                    </Link>
                    <p className="text-xs text-ink-400">
                      {r.novel.author_name} · المصادر: {r.sources.join('، ')}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {r.matches.map((m, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-600 dark:bg-red-500/15 dark:text-red-300"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      className="btn-outline btn-sm"
                      onClick={() => unpublish(r.novel)}
                      disabled={busyId === r.novel.id}
                    >
                      <EyeOff className="h-4 w-4" /> إلغاء النشر
                    </button>
                    <button
                      className="btn-ghost btn-sm text-red-500"
                      onClick={() => setToDelete(r.novel)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-sage-200 bg-sage-50 p-4 text-sm text-sage-700 dark:border-sage-500/30 dark:bg-sage-500/10 dark:text-sage-300">
              <Check className="mb-1 inline h-4 w-4" /> لا يوجد محتوى مخالف في العناوين أو الأوصاف أو الفصول.
            </div>
          )}
        </div>
      )}

      {/* الروايات المُعلّمة */}
      <div className="mb-3 flex items-center gap-2">
        <Flag className="h-5 w-5 text-red-500" />
        <h2 className="font-display text-lg font-bold text-ink-900 dark:text-parchment-100">
          روايات مُعلّمة للمراجعة ({flagged.length})
        </h2>
        <button className="btn-ghost btn-sm ms-auto" onClick={load}>
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </div>

      {flagged.length ? (
        <div className="space-y-3">
          {flagged.map((n) => (
            <div key={n.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg">
                <CoverImage src={n.cover_url} title={n.title} className="h-full w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/novel/${n.slug}`}
                  className="font-medium text-ink-800 hover:text-gold-600 dark:text-ink-100"
                >
                  {n.title}
                </Link>
                <p className="text-xs text-ink-400">
                  {n.author_name} · {n.category?.name_ar || 'بدون تصنيف'} · {formatDate(n.updated_at)}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
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
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-600 dark:bg-red-500/15 dark:text-red-300">
                    مُعلّمة
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button className="btn-gold btn-sm" onClick={() => unflag(n)} disabled={busyId === n.id}>
                  {busyId === n.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  اعتماد
                </button>
                <button className="btn-outline btn-sm" onClick={() => unpublish(n)} disabled={busyId === n.id}>
                  <EyeOff className="h-4 w-4" /> إلغاء النشر
                </button>
                <button className="btn-ghost btn-sm text-red-500" onClick={() => setToDelete(n)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6" />}
          title="لا توجد روايات مُعلّمة"
          description="استخدم زر «فحص المحتوى» للبحث في كل الروايات والفصول عن أي محتوى مخالف."
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        danger
        title="حذف الرواية"
        confirmLabel="حذف نهائي"
        message={toDelete ? `سيتم حذف «${toDelete.title}» وكل فصولها نهائيًا. لا يمكن التراجع.` : ''}
      />
    </div>
  )
}
