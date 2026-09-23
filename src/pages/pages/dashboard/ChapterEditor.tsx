import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Settings2,
  Users,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { PageLoader } from '../../components/ui/Spinner'
import { BlockEditor, newBlock, type BlockDraft } from '../../components/editor/BlockEditor'
import { AudioPicker, MediaPicker } from '../../components/editor/MediaPicker'
import { uploadFile, readAudioDuration, readImageSize, isGif } from '../../lib/storage'
import { cn, slugify, uniqueSlug } from '../../lib/utils'
import type { AudioTrack, Chapter, Character, Media, Novel } from '../../lib/types'

export default function ChapterEditor() {
  const { novelId, chapterId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { success, error } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [novel, setNovel] = useState<Novel | null>(null)
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [blocks, setBlocks] = useState<BlockDraft[]>([])
  const [originalIds, setOriginalIds] = useState<string[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [media, setMedia] = useState<Media[]>([])
  const [audio, setAudio] = useState<AudioTrack[]>([])

  const [meta, setMeta] = useState({
    chapter_number: 1,
    title: '',
    is_published: false,
    access_type: 'free' as 'free' | 'paid',
  })

  const [mediaPicker, setMediaPicker] = useState<{ open: boolean; type: 'image' | 'gif' }>({
    open: false,
    type: 'image',
  })
  const [audioPicker, setAudioPicker] = useState(false)

  /* ------------------------------ تحميل البيانات ------------------------------ */
  const load = useCallback(async () => {
    if (!novelId || !chapterId) return
    setLoading(true)
    const [{ data: n }, { data: ch }, { data: bl }, { data: chars }, { data: md }, { data: au }] =
      await Promise.all([
        supabase.from('novels').select('*').eq('id', novelId).maybeSingle(),
        supabase.from('chapters').select('*').eq('id', chapterId).maybeSingle(),
        supabase.from('chapter_blocks').select('*').eq('chapter_id', chapterId).order('position'),
        supabase.from('characters').select('*').eq('novel_id', novelId).order('position'),
        supabase.from('media').select('*').eq('novel_id', novelId).order('created_at', { ascending: false }),
        supabase.from('audio_tracks').select('*').eq('novel_id', novelId).order('created_at', { ascending: false }),
      ])
    if (!n || !ch) {
      error('تعذّر تحميل الفصل')
      setLoading(false)
      return
    }
    setNovel(n as Novel)
    setChapter(ch as Chapter)
    setMeta({
      chapter_number: Number((ch as Chapter).chapter_number),
      title: (ch as Chapter).title ?? '',
      is_published: (ch as Chapter).is_published,
      access_type: (ch as Chapter).access_type,
    })
    const drafts: BlockDraft[] = (bl ?? []).map((b: any) => ({
      key: b.id,
      id: b.id,
      type: b.type,
      content: b.content ?? '',
      metadata: b.metadata ?? {},
    }))
    setBlocks(drafts)
    setOriginalIds((bl ?? []).map((b: any) => b.id))
    setCharacters((chars ?? []) as Character[])
    setMedia((md ?? []) as Media[])
    setAudio((au ?? []) as AudioTrack[])
    setLoading(false)
  }, [novelId, chapterId, error])

  useEffect(() => {
    load()
  }, [load])

  /* --------------------------------- الحفظ --------------------------------- */
  const save = async () => {
    if (!chapter || !novelId) return
    setSaving(true)
    try {
      // 1) تحديث بيانات الفصل
      const slug = chapter.slug || uniqueSlug(meta.title || `chapter-${meta.chapter_number}`)
      const { error: e1 } = await supabase
        .from('chapters')
        .update({
          chapter_number: meta.chapter_number,
          title: meta.title.trim(),
          slug,
          is_published: meta.is_published,
          published_at: meta.is_published ? chapter.published_at || new Date().toISOString() : chapter.published_at,
          access_type: meta.access_type,
        })
        .eq('id', chapter.id)
      if (e1) throw e1

      // 2) حذف البلوكات المُزالة
      const currentIds = blocks.filter((b) => b.id).map((b) => b.id as string)
      const toDelete = originalIds.filter((id) => !currentIds.includes(id))
      if (toDelete.length) {
        await supabase.from('chapter_blocks').delete().in('id', toDelete)
      }

      // 3) تحديث/إدراج البلوكات بالترتيب
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i]
        const payload = {
          chapter_id: chapter.id,
          type: b.type,
          content: b.content || null,
          position: i,
          metadata: b.metadata ?? {},
        }
        if (b.id) {
          await supabase.from('chapter_blocks').update(payload).eq('id', b.id)
        } else {
          const { data } = await supabase.from('chapter_blocks').insert(payload).select('id').single()
          if (data) {
            b.id = data.id
          }
        }
      }

      setOriginalIds(blocks.filter((b) => b.id).map((b) => b.id as string))
      setBlocks((bs) => bs.map((b) => ({ ...b })))
      success('تم حفظ الفصل')
    } catch (e: any) {
      error(e?.message || 'تعذّر حفظ الفصل')
    } finally {
      setSaving(false)
    }
  }

  /* ------------------------------ رفع الوسائط ------------------------------ */
  const uploadMedia = async (files: File[]) => {
    if (!user || !novelId) return
    const created: Media[] = []
    for (const file of files) {
      try {
        const type = isGif(file) ? 'gif' : 'image'
        const res = await uploadFile('chapter-media', file, { userId: user.id, novelId })
        const dims = await readImageSize(file)
        const { data, error: e } = await supabase
          .from('media')
          .insert({
            novel_id: novelId,
            chapter_id: chapter?.id ?? null,
            owner_id: user.id,
            type,
            bucket: 'chapter-media',
            path: res.path,
            url: res.url,
            name: res.name,
            mime_type: res.mimeType,
            size_bytes: res.size,
            metadata: dims,
          })
          .select('*')
          .single()
        if (e) throw e
        created.push(data as Media)
      } catch (err: any) {
        error(err?.message || 'تعذّر رفع أحد الملفات')
      }
    }
    if (created.length) {
      setMedia((m) => [...created, ...m])
      success(`تم رفع ${created.length} ملف`)
    }
  }

  const uploadAudio = async (files: File[]) => {
    if (!user || !novelId) return
    const created: AudioTrack[] = []
    for (const file of files) {
      try {
        const res = await uploadFile('audio', file, { userId: user.id, novelId })
        const duration = await readAudioDuration(file)
        const { data, error: e } = await supabase
          .from('audio_tracks')
          .insert({
            novel_id: novelId,
            chapter_id: chapter?.id ?? null,
            owner_id: user.id,
            name: file.name.replace(/\.[^.]+$/, ''),
            bucket: 'audio',
            path: res.path,
            url: res.url,
            mime_type: res.mimeType,
            size_bytes: res.size,
            duration,
          })
          .select('*')
          .single()
        if (e) throw e
        created.push(data as AudioTrack)
      } catch (err: any) {
        error(err?.message || 'تعذّر رفع أحد المقاطع')
      }
    }
    if (created.length) {
      setAudio((a) => [...created, ...a])
      success(`تم رفع ${created.length} مقطع صوتي`)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="container-app py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to={`/dashboard/novels/${novelId}`} className="btn-ghost btn-sm">
          <ArrowRight className="h-4 w-4" /> رجوع للرواية
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold text-ink-900 dark:text-parchment-100">
            تحرير الفصل
          </h1>
          <p className="truncate text-xs text-ink-400">{novel?.title}</p>
        </div>
        <div className="ms-auto flex flex-wrap gap-2">
          <Link to={`/dashboard/novels/${novelId}/characters`} className="btn-outline btn-sm">
            <Users className="h-3.5 w-3.5" /> الشخصيات
          </Link>
          <button className="btn-gold" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ الفصل
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* المحرر */}
        <div className="space-y-4">
          <div className="card space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
              <div>
                <label className="label">رقم الفصل</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={meta.chapter_number}
                  onChange={(e) => setMeta((m) => ({ ...m, chapter_number: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="label">عنوان الفصل</label>
                <input
                  className="input"
                  value={meta.title}
                  onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
                  placeholder="اكتب عنوانًا حرًا للفصل (مثال: مشتركة الشتاء)"
                />
              </div>
            </div>
            <p className="text-xs text-ink-400">
              يمكنك تعديل الرقم والعنوان بشكل مستقل تمامًا.
            </p>
          </div>

          <BlockEditor
            blocks={blocks}
            onChange={setBlocks}
            characters={characters}
            media={media}
            audio={audio}
            onRequestMedia={(type) => setMediaPicker({ open: true, type })}
            onRequestAudio={() => setAudioPicker(true)}
          />
        </div>

        {/* الإعدادات الجانبية */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-4">
            <h3 className="mb-3 inline-flex items-center gap-2 font-display text-sm font-semibold text-ink-900 dark:text-parchment-100">
              <Settings2 className="h-4 w-4 text-gold-500" /> إعدادات النشر
            </h3>
            <button
              onClick={() => setMeta((m) => ({ ...m, is_published: !m.is_published }))}
              className={cn(
                'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition',
                meta.is_published
                  ? 'border-sage-300 bg-sage-50 text-sage-700 dark:border-sage-700 dark:bg-sage-500/10 dark:text-sage-300'
                  : 'border-ink-200 bg-ink-50 text-ink-600 dark:border-ink-700 dark:bg-ink-800/50 dark:text-ink-300',
              )}
            >
              <span className="inline-flex items-center gap-2">
                {meta.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {meta.is_published ? 'منشور' : 'مسودة'}
              </span>
            </button>

            <div className="mt-3">
              <label className="label">نوع الوصول</label>
              <select
                className="input"
                value={meta.access_type}
                onChange={(e) => setMeta((m) => ({ ...m, access_type: e.target.value as any }))}
              >
                <option value="free">مجاني</option>
                <option value="paid">مدفوع (قريبًا)</option>
              </select>
              <p className="mt-1 text-[11px] text-ink-400">
                جميع الفصول مجانية افتراضيًا. الدفع غير مُفعّل حاليًا.
              </p>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="mb-2 font-display text-sm font-semibold text-ink-900 dark:text-parchment-100">
              عناصر الفصل
            </h3>
            <p className="text-xs text-ink-400">
              {blocks.length} عنصر · {blocks.filter((b) => b.type === 'image' || b.type === 'gif').length} صورة ·{' '}
              {blocks.filter((b) => b.type === 'audio').length} صوت
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-outline btn-sm" onClick={() => setBlocks((b) => [...b, newBlock('text')])}>
                + نص
              </button>
              <button className="btn-outline btn-sm" onClick={() => setMediaPicker({ open: true, type: 'image' })}>
                + صورة
              </button>
              <button className="btn-outline btn-sm" onClick={() => setAudioPicker(true)}>
                + صوت
              </button>
            </div>
          </div>
        </div>
      </div>

      <MediaPicker
        open={mediaPicker.open}
        onClose={() => setMediaPicker((p) => ({ ...p, open: false }))}
        type={mediaPicker.type}
        items={media}
        onUpload={uploadMedia}
        onSelect={(m) => {
          // إضافة بلوك وسائط جديد يشير إلى الملف المختار
          setBlocks((bs) => [
            ...bs,
            {
              key: `tmp-${Math.random().toString(36).slice(2)}`,
              id: null,
              type: m.type,
              content: m.url,
              metadata: { media_id: m.id, align: 'center', size: 'large' },
            },
          ])
        }}
      />

      <AudioPicker
        open={audioPicker}
        onClose={() => setAudioPicker(false)}
        items={audio}
        onUpload={uploadAudio}
        onSelect={(a) => {
          setBlocks((bs) => [
            ...bs,
            {
              key: `tmp-${Math.random().toString(36).slice(2)}`,
              id: null,
              type: 'audio',
              content: a.url,
              metadata: { audio_id: a.id, audio_name: a.name },
            },
          ])
        }}
      />
    </div>
  )
}
