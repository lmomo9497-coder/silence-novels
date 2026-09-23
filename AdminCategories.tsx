import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Loader2, Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { PageLoader } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { slugify } from '../../lib/utils'
import type { Category } from '../../lib/types'

export default function AdminCategories() {
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})

  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [adding, setAdding] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAr, setEditAr] = useState('')
  const [editEn, setEditEn] = useState('')

  const [toDelete, setToDelete] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: cats }, { data: novels }] = await Promise.all([
      supabase.from('categories').select('*').order('position'),
      supabase.from('novels').select('category_id'),
    ])
    setCategories((cats ?? []) as Category[])
    const map: Record<string, number> = {}
    for (const n of (novels ?? []) as any[]) {
      if (n.category_id) map[n.category_id] = (map[n.category_id] ?? 0) + 1
    }
    setCounts(map)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const add = async () => {
    if (!nameAr.trim()) {
      error('أدخل اسم التصنيف بالعربية')
      return
    }
    setAdding(true)
    const slug = slugify(nameEn.trim() || nameAr.trim())
    const position = categories.length ? Math.max(...categories.map((c) => c.position)) + 1 : 1
    const { data, error: e } = await supabase
      .from('categories')
      .insert({
        slug,
        name_ar: nameAr.trim(),
        name_en: nameEn.trim() || nameAr.trim(),
        position,
      })
      .select('*')
      .single()
    setAdding(false)
    if (e || !data) {
      error(e?.message?.includes('duplicate') ? 'هذا التصنيف موجود بالفعل' : 'تعذّر إضافة التصنيف')
      return
    }
    setCategories((c) => [...c, data as Category])
    setNameAr('')
    setNameEn('')
    success('تمت إضافة التصنيف')
  }

  const saveEdit = async (cat: Category) => {
    const { error: e } = await supabase
      .from('categories')
      .update({ name_ar: editAr.trim(), name_en: editEn.trim() || editAr.trim() })
      .eq('id', cat.id)
    if (e) {
      error('تعذّر حفظ التعديل')
      return
    }
    setCategories((cs) =>
      cs.map((c) => (c.id === cat.id ? { ...c, name_ar: editAr.trim(), name_en: editEn.trim() || editAr.trim() } : c)),
    )
    setEditingId(null)
    success('تم حفظ التعديل')
  }

  const move = async (cat: Category, dir: -1 | 1) => {
    const sorted = [...categories].sort((a, b) => a.position - b.position)
    const idx = sorted.findIndex((c) => c.id === cat.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const other = sorted[swapIdx]
    const a = cat.position
    const b = other.position
    setCategories((cs) =>
      cs.map((c) => (c.id === cat.id ? { ...c, position: b } : c.id === other.id ? { ...c, position: a } : c)),
    )
    await Promise.all([
      supabase.from('categories').update({ position: b }).eq('id', cat.id),
      supabase.from('categories').update({ position: a }).eq('id', other.id),
    ])
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    const { error: e } = await supabase.from('categories').delete().eq('id', toDelete.id)
    setDeleting(false)
    if (e) {
      error('تعذّر حذف التصنيف')
      return
    }
    setCategories((cs) => cs.filter((c) => c.id !== toDelete.id))
    success('تم حذف التصنيف')
    setToDelete(null)
  }

  if (loading) return <PageLoader />

  return (
    <div className="container-app py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-100 text-gold-600 dark:bg-gold-500/15 dark:text-gold-400">
          <Tags className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900 dark:text-parchment-100">
            إدارة التصنيفات
          </h1>
          <p className="text-xs text-ink-400">{categories.length} تصنيف</p>
        </div>
      </div>

      {/* إضافة تصنيف */}
      <div className="card mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="label">الاسم بالعربية</label>
            <input
              className="input"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: فانتازيا"
            />
          </div>
          <div>
            <label className="label">الاسم بالإنجليزية (اختياري)</label>
            <input
              className="input"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Fantasy"
            />
          </div>
          <div className="flex items-end">
            <button className="btn-gold w-full sm:w-auto" onClick={add} disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              إضافة
            </button>
          </div>
        </div>
      </div>

      {categories.length ? (
        <div className="card divide-y divide-ink-100 dark:divide-ink-800">
          {[...categories]
            .sort((a, b) => a.position - b.position)
            .map((cat, i, arr) => (
              <div key={cat.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex flex-col gap-0.5">
                  <button
                    className="btn-ghost btn-sm px-1.5 py-0.5"
                    disabled={i === 0}
                    onClick={() => move(cat, -1)}
                    title="أعلى"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="btn-ghost btn-sm px-1.5 py-0.5"
                    disabled={i === arr.length - 1}
                    onClick={() => move(cat, 1)}
                    title="أسفل"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {editingId === cat.id ? (
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <input
                      className="input flex-1"
                      value={editAr}
                      onChange={(e) => setEditAr(e.target.value)}
                      placeholder="الاسم بالعربية"
                    />
                    <input
                      className="input flex-1"
                      value={editEn}
                      onChange={(e) => setEditEn(e.target.value)}
                      placeholder="English"
                    />
                    <button className="btn-gold btn-sm" onClick={() => saveEdit(cat)}>
                      <Check className="h-4 w-4" />
                    </button>
                    <button className="btn-ghost btn-sm" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink-800 dark:text-ink-100">{cat.name_ar}</p>
                      <p className="text-xs text-ink-400">
                        {cat.name_en} · {cat.slug}
                      </p>
                    </div>
                    <span className="chip">{counts[cat.id] ?? 0} رواية</span>
                    <div className="flex gap-1">
                      <button
                        className="btn-ghost btn-sm"
                        title="تعديل"
                        onClick={() => {
                          setEditingId(cat.id)
                          setEditAr(cat.name_ar)
                          setEditEn(cat.name_en)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="btn-ghost btn-sm text-red-500"
                        title="حذف"
                        onClick={() => setToDelete(cat)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
        </div>
      ) : (
        <EmptyState icon={<Tags className="h-6 w-6" />} title="لا توجد تصنيفات" />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        danger
        title="حذف التصنيف"
        confirmLabel="حذف"
        message={
          toDelete
            ? counts[toDelete.id]
              ? `يوجد ${counts[toDelete.id]} رواية مرتبطة بهذا التصنيف. ستصبح بدون تصنيف بعد الحذف.`
              : `سيتم حذف «${toDelete.name_ar}» نهائيًا.`
            : ''
        }
      />
    </div>
  )
}
