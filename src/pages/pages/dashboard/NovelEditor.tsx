import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layers,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { PageLoader } from '../../components/ui/Spinner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { CoverImage } from '../../components/novel/CoverImage'
import { uploadFile } from '../../lib/storage'
import { LANGUAGES, NOVEL_STATUS, directionForLanguage } from '../../lib/constants'
import { cn, formatNumber, slugify, uniqueSlug } from '../../lib/utils'
import type { Category, Chapter, Novel, Tag } from '../../lib/types'

export default function NovelEditor() {
  const { novelId } = useParams()
  const isNew = !novelId
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { success, error } = useToast()

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [novel, setNovel] = useState<Novel | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const coverRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: '',
    author_name: profile?.display_name || '',
    description: '',
    language: 'ar',
    category_id: '',
    status: 'ongoing' as 'ongoing' | 'completed',
    cover_url: '',
    is_published: false,
  })

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }))

  /* ------------------------------ تحميل البيانات ------------------------------ */
  useEffect(() => {
    ;(async () => {
      const [{ data: cats }, { data: tags }] = await Promise.all([
        supabase.from('categories').select('*').order('position'),
        supabase.from('tags').select('*').order('name'),
      ])
      setCategories((cats ?? []) as Category[])
      setAllTags((tags ?? []) as Tag[])
    })()
  }, [])

  const loadNovel = useCallback(async () => {
    if (!novelId) return
    setLoading(true)
    const { data, error: e } = await supabase
      .from('novels')
      .select('*, category:categories(*)')
      .eq('id', novelId)
      .maybeSingle()
    if (e || !data) {
      error('تعذّر تحميل الرواية')
      setLoading(false)
      return
    }
    const n = data as Novel
    setNovel(n)
    setForm({
      title: n.title,
      author_name: n.author_name,
      description: n.description ?? '',
      language: n.language,
      category_id: n.category_id ?? '',
      status: n.status,
      cover_url: n.cover_url ?? '',
      is_published: n.is_published,
    })
    const { data: nt } = await supabase.from('novel_tags').select('tag_id').eq('novel_id', n.id)
    setSelectedTags((nt ?? []).map((r: any) => r.tag_id))
    const { data: chs } = await supabase
      .from('chapters')
      .select('*')
      .eq('novel_id', n.id)
      .order('chapter_number', { ascending: true })
    setChapters((chs ?? []) as Chapter[])
    setLoading(false)
  }, [novelId, error])

  useEffect(() => {
    loadNovel()
  }, [loadNovel])

  /* --------------------------------- الغلاف --------------------------------- */
  const onPickCover = async (file: File) => {
    if (!user) return
    if (!file.type.startsWith('image/')) {
      error('الرجاء اختيار ملف صورة')
      return
    }
    setUploadingCover(true)
    try {
      const res = await uploadFile('covers', file, { userId: user.id, novelId: novelId || 'new' })
      set('cover_url', res.url)
      success('تم رفع الغلاف')
    } catch (e: any) {
      error(e?.message || 'تعذّر رفع الغلاف')
    } finally {
      setUploadingCover(false)
    }
  }

  /* --------------------------------- الحفظ --------------------------------- */
  const save = async () => {
    if (!user) return
    if (!form.title.trim()) {
      error('عنوان الرواية مطلوب')
      return
    }
    if (!form.author_name.trim()) {
      error('اسم المؤلف مطلوب')
      return
    }
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      author_name: form.author_name.trim(),
      description: form.description.trim() || null,
      language: form.language,
      direction: directionForLanguage(form.language),
      category_id: form.category_id || null,
      status: form.status,
      cover_url: form.cover_url || null,
      is_published: form.is_published,
    }

    if (isNew) {
      const slug = uniqueSlug(form.title)
      const { data, error: e } = await supabase
        .from('novels')
        .insert({ ...payload, slug, author_id: user.id })
        .select('id')
        .single()
      if (e || !data) {
        setSaving(false)
        error('تعذّر إنشاء الرواية')
        return
      }
      await syncTags(data.id)
      setSaving(false)
      success('تم إنشاء الرواية')
      navigate(`/dashboard/novels/${data.id}`, { replace: true })
    } else if (novel) {
      const { error: e } = await supabase.from('novels').update(payload).eq('id', novel.id)
      if (e) {
        setSaving(false)
        error('تعذّر حفظ التغييرات')
        return
      }
      await syncTags(novel.id)
      setSaving(false)
      success('تم حفظ التغييرات')
      loadNovel()
    }
  }

  const syncTags = async (nid: string) => {
    await supabase.from('novel_tags').delete().eq('novel_id', nid)
    if (selectedTags.length) {
      await supabase
        .from('novel_tags')
        .insert(selectedTags.map((tag_id) => ({ novel_id: nid, tag_id })))
    }
  }

  /* --------------------------------- الوسوم --------------------------------- */
  const addTag = async () => {
    const name = tagInput.trim()
    if (!name) return
    const slug = slugify(name)
    let tag = allTags.find((t) => t.slug === slug || t.name === name)
    if (!tag) {
      const { data, error: e } = await supabase
        .from('tags')
        .insert({ name, slug: slug || uniqueSlug(name) })
        .select('*')
        .single()
      if (e || !data) {
        error('تعذّر إضافة الوسم')
        return
      }
      tag = data as Tag
      setAllTags((t) => [...t, tag!])
    }
    if (!selectedTags.includes(tag.id)) setSelectedTags((s) => [...s, tag!.id])
    setTagInput('')
  }

  /* -------------------------------- الفصول -------------------------------- */
  const addChapter = async () => {
    if (!novel) return
    const nextNum = chapters.length ? Math.max(...chapters.map((c) => Number(c.chapter_number))) + 1 : 1
    const { data, error: e } = await supabase
      .from('chapters')
      .insert({
        novel_id: novel.id,
        chapter_number: nextNum,
        title: '',
        slug: uniqueSlug(`chapter-${nextNum}`),
        is_published: false,
        access_type: 'free',
      })
      .select('id')
      .single()
    if (e || !data) {
      error('تعذّر إنشاء الفصل')
      return
    }
    navigate(`/dashboard/novels/${novel.id}/chapters/${data.id}`)
  }

  const togglePublish = async (ch: Chapter) => {
    const { error: e } = await supabase
      .from('chapters')
      .update({
        is_published: !ch.is_published,
        published_at: !ch.is_published ? new Date().toISOString() : ch.published_at,
      })
      .eq('id', ch.id)
    if (e) {
      error('تعذّر تغيير حالة النشر')
      return
    }
    setChapters((cs) => cs.map((c) => (c.id === ch.id ? { ...c, is_published: !c.is_published } : c)))
    success(!ch.is_published ? 'تم نشر الفصل' : 'تم إلغاء نشر الفصل')
  }

  const deleteChapter = async (ch: Chapter) => {
    if (!confirm(`حذف الفصل «${ch.title || 'فصل ' + ch.chapter_number}»؟`)) return
    const { error: e } = await supabase.from('chapters').delete().eq('id', ch.id)
    if (e) {
      error('تعذّر حذف الفصل')
      return
    }
    setChapters((cs) => cs.filter((c) => c.id !== ch.id))
    success('تم حذف الفصل')
  }

  const moveChapter = async (ch: Chapter, dir: -1 | 1) => {
    const idx = chapters.findIndex((c) => c.id === ch.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= chapters.length) return
    const other = chapters[swapIdx]
    const a = Number(ch.chapter_number)
    const b = Number(other.chapter_number)
    await Promise.all([
      supabase.from('chapters').update({ chapter_number: b }).eq('id', ch.id),
      supabase.from('chapters').update({ chapter_number: a }).eq('id', other.id),
    ])
    const next = [...chapters]
    next[idx] = { ...ch, chapter_number: b }
    next[swapIdx] = { ...other, chapter_number: a }
    next.sort((x, y) => Number(x.chapter_number) - Number(y.chapter_number))
    setChapters(next)
  }

  const availableTags = useMemo(
    () => allTags.filter((t) => !selectedTags.includes(t.id)),
    [allTags, selectedTags],
  )

  if (loading) return <PageLoader />

  return (
    <div className="container-app py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/dashboard" className="btn-ghost btn-sm">
          <ArrowRight className="h-4 w-4" /> رجوع
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-parchment-100">
          {isNew ? 'رواية جديدة' : 'تعديل الرواية'}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* الغلاف */}
        <div className="space-y-4">
          <div className="card p-4">
            <label className="label">غلاف الرواية</label>
            <div className="relative">
              <CoverImage src={form.cover_url} title={form.title || 'غلاف'} />
              <button
                onClick={() => coverRef.current?.click()}
                disabled={uploadingCover}
                className="btn-gold btn-sm absolute bottom-2 start-2"
              >
                {uploadingCover ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {form.cover_url ? 'تغيير' : 'رفع غلاف'}
              </button>
              {form.cover_url && (
                <button
                  onClick={() => set('cover_url', '')}
                  className="absolute top-2 end-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink-950/60 text-white backdrop-blur hover:bg-red-600"
                  aria-label="إزالة الغلاف"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <input
                ref={coverRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onPickCover(f)
                  e.target.value = ''
                }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-400">
              JPG / PNG / WEBP / GIF — يُحفظ الأصل دون فقدان الحركة.
            </p>
          </div>

          <div className="card p-4">
            <label className="label">حالة النشر</label>
            <button
              onClick={() => set('is_published', !form.is_published)}
              className={cn(
                'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition',
                form.is_published
                  ? 'border-sage-300 bg-sage-50 text-sage-700 dark:border-sage-700 dark:bg-sage-500/10 dark:text-sage-300'
                  : 'border-ink-200 bg-ink-50 text-ink-600 dark:border-ink-700 dark:bg-ink-800/50 dark:text-ink-300',
              )}
            >
              <span className="inline-flex items-center gap-2">
                {form.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {form.is_published ? 'منشورة للقرّاء' : 'مسودة (غير ظاهرة)'}
              </span>
              <span
                className={cn(
                  'relative h-6 w-11 rounded-full transition',
                  form.is_published ? 'bg-sage-500' : 'bg-ink-300 dark:bg-ink-600',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
                    form.is_published ? 'start-0.5' : 'start-5',
                  )}
                />
              </span>
            </button>
          </div>
        </div>

        {/* البيانات */}
        <div className="space-y-6">
          <div className="card space-y-4 p-5">
            <div>
              <label className="label">عنوان الرواية *</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="مثال: مشتركة الشتاء"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">اسم المؤلف *</label>
                <input
                  className="input"
                  value={form.author_name}
                  onChange={(e) => set('author_name', e.target.value)}
                  placeholder="اسمك أو اسمك المستعار"
                />
              </div>
              <div>
                <label className="label">اللغة</label>
                <select
                  className="input"
                  value={form.language}
                  onChange={(e) => set('language', e.target.value)}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label} ({l.direction.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">التصنيف (اختياري)</label>
                <select
                  className="input"
                  value={form.category_id}
                  onChange={(e) => set('category_id', e.target.value)}
                >
                  <option value="">بدون تصنيف</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">الحالة</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                >
                  {NOVEL_STATUS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">الوصف</label>
              <textarea
                className="input min-h-[140px] resize-y"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="اكتب وصفًا جاذبًا للرواية…"
              />
            </div>

            {/* الوسوم */}
            <div>
              <label className="label">الوسوم (اختياري)</label>
              <div className="mb-2 flex flex-wrap gap-2">
                {selectedTags.map((id) => {
                  const t = allTags.find((x) => x.id === id)
                  if (!t) return null
                  return (
                    <span key={id} className="chip chip-active">
                      {t.name}
                      <button
                        onClick={() => setSelectedTags((s) => s.filter((x) => x !== id))}
                        aria-label="إزالة"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <input
                  className="input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="أضف وسمًا ثم Enter"
                  list="tag-suggestions"
                />
                <datalist id="tag-suggestions">
                  {availableTags.map((t) => (
                    <option key={t.id} value={t.name} />
                  ))}
                </datalist>
                <button className="btn-outline shrink-0" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isNew ? 'إنشاء الرواية' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>

          {/* الفصول */}
          {!isNew && novel && (
            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink-900 dark:text-parchment-100">
                  <Layers className="h-5 w-5 text-gold-500" /> الفصول ({chapters.length})
                </h2>
                <div className="flex gap-2">
                  <Link to={`/dashboard/novels/${novel.id}/characters`} className="btn-outline btn-sm">
                    <Users className="h-3.5 w-3.5" /> الشخصيات
                  </Link>
                  <Link to={`/dashboard/novels/${novel.id}/media`} className="btn-outline btn-sm">
                    <ImageIcon className="h-3.5 w-3.5" /> الوسائط
                  </Link>
                  <button className="btn-gold btn-sm" onClick={addChapter}>
                    <Plus className="h-3.5 w-3.5" /> فصل جديد
                  </button>
                </div>
              </div>

              {!chapters.length ? (
                <div className="rounded-xl border border-dashed border-ink-200 p-8 text-center dark:border-ink-700">
                  <BookOpen className="mx-auto mb-2 h-8 w-8 text-ink-300" />
                  <p className="text-sm text-ink-500 dark:text-ink-400">
                    لا توجد فصول بعد. ابدأ بإضافة الفصل الأول.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chapters.map((ch, i) => (
                    <div
                      key={ch.id}
                      className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 dark:border-ink-800"
                    >
                      <div className="flex flex-col">
                        <button
                          className="text-ink-400 hover:text-ink-700 disabled:opacity-30 dark:hover:text-ink-100"
                          onClick={() => moveChapter(ch, -1)}
                          disabled={i === 0}
                          aria-label="تحريك لأعلى"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          className="text-ink-400 hover:text-ink-700 disabled:opacity-30 dark:hover:text-ink-100"
                          onClick={() => moveChapter(ch, 1)}
                          disabled={i === chapters.length - 1}
                          aria-label="تحريك لأسفل"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-sm font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                        {Number(ch.chapter_number)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink-900 dark:text-parchment-100">
                          {ch.title || 'بدون عنوان'}
                        </p>
                        <p className="text-xs text-ink-400">
                          {formatNumber(ch.views)} قراءة · {ch.access_type === 'free' ? 'مجاني' : 'مدفوع'}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'hidden rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline',
                          ch.is_published
                            ? 'bg-sage-100 text-sage-700 dark:bg-sage-500/20 dark:text-sage-300'
                            : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400',
                        )}
                      >
                        {ch.is_published ? 'منشور' : 'مسودة'}
                      </span>
                      <div className="flex gap-1">
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => togglePublish(ch)}
                          title={ch.is_published ? 'إلغاء النشر' : 'نشر'}
                        >
                          {ch.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <Link
                          to={`/dashboard/novels/${novel.id}/chapters/${ch.id}`}
                          className="btn-outline btn-sm"
                        >
                          تحرير
                        </Link>
                        <button
                          className="btn-ghost btn-sm text-red-600"
                          onClick={() => deleteChapter(ch)}
                          aria-label="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
