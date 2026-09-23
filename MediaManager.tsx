import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Copy,
  Eye,
  FileAudio,
  Image as ImageIcon,
  Loader2,
  Music,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { PageLoader } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { AudioPlayer } from '../../components/reader/AudioPlayer'
import {
  uploadFile,
  removeFile,
  readAudioDuration,
  readImageSize,
  isGif,
} from '../../lib/storage'
import { cn, formatBytes, formatDuration } from '../../lib/utils'
import type { AudioTrack, Chapter, Media, Novel } from '../../lib/types'

type Tab = 'image' | 'gif' | 'audio'

interface Usage {
  chapterId: string
  chapterTitle: string
  chapterNumber: number
}

export default function MediaManager() {
  const { novelId } = useParams()
  const { user } = useAuth()
  const { success, error } = useToast()

  const [loading, setLoading] = useState(true)
  const [novel, setNovel] = useState<Novel | null>(null)
  const [media, setMedia] = useState<Media[]>([])
  const [audio, setAudio] = useState<AudioTrack[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [usage, setUsage] = useState<Record<string, Usage[]>>({})
  const [tab, setTab] = useState<Tab>('image')
  const [uploading, setUploading] = useState(false)

  const [preview, setPreview] = useState<Media | null>(null)
  const [toDelete, setToDelete] = useState<{ kind: Tab; id: string; name: string; used: Usage[] } | null>(
    null,
  )
  const [deleting, setDeleting] = useState(false)
  const [renaming, setRenaming] = useState<AudioTrack | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [replacing, setReplacing] = useState<{ kind: Tab; id: string } | null>(null)

  const imageInput = useRef<HTMLInputElement>(null)
  const gifInput = useRef<HTMLInputElement>(null)
  const audioInput = useRef<HTMLInputElement>(null)
  const replaceInput = useRef<HTMLInputElement>(null)

  /* ------------------------------ تحميل البيانات ------------------------------ */
  const load = useCallback(async () => {
    if (!novelId) return
    setLoading(true)
    const [{ data: n }, { data: md }, { data: au }, { data: ch }] = await Promise.all([
      supabase.from('novels').select('*').eq('id', novelId).maybeSingle(),
      supabase.from('media').select('*').eq('novel_id', novelId).order('created_at', { ascending: false }),
      supabase
        .from('audio_tracks')
        .select('*')
        .eq('novel_id', novelId)
        .order('created_at', { ascending: false }),
      supabase
        .from('chapters')
        .select('id, novel_id, chapter_number, title, slug, is_published, published_at, views, access_type, price, created_at, updated_at')
        .eq('novel_id', novelId)
        .order('chapter_number'),
    ])
    setNovel((n as Novel) ?? null)
    setMedia((md ?? []) as Media[])
    setAudio((au ?? []) as AudioTrack[])
    const chapterList = (ch ?? []) as Chapter[]
    setChapters(chapterList)

    // خريطة الاستخدام: أي فصل يستخدم كل ملف (عبر chapter_blocks.metadata)
    if (chapterList.length) {
      const ids = chapterList.map((c) => c.id)
      const { data: blocks } = await supabase
        .from('chapter_blocks')
        .select('chapter_id, type, metadata')
        .in('chapter_id', ids)
      const map: Record<string, Usage[]> = {}
      const byId = new Map(chapterList.map((c) => [c.id, c]))
      for (const b of (blocks ?? []) as any[]) {
        const meta = b.metadata ?? {}
        const ch = byId.get(b.chapter_id)
        if (!ch) continue
        const entry: Usage = {
          chapterId: ch.id,
          chapterTitle: ch.title,
          chapterNumber: ch.chapter_number,
        }
        if (meta.media_id) {
          ;(map[meta.media_id] ||= []).push(entry)
        }
        if (meta.audio_id) {
          ;(map[meta.audio_id] ||= []).push(entry)
        }
      }
      setUsage(map)
    } else {
      setUsage({})
    }
    setLoading(false)
  }, [novelId])

  useEffect(() => {
    load()
  }, [load])

  const images = useMemo(() => media.filter((m) => m.type === 'image'), [media])
  const gifs = useMemo(() => media.filter((m) => m.type === 'gif'), [media])

  /* ------------------------------ الرفع ------------------------------ */
  const uploadImages = async (files: File[], forceGif = false) => {
    if (!user || !novelId || !files.length) return
    setUploading(true)
    const created: Media[] = []
    for (const file of files) {
      try {
        const type = forceGif || isGif(file) ? 'gif' : 'image'
        const res = await uploadFile('chapter-media', file, { userId: user.id, novelId })
        const dims = await readImageSize(file)
        const { data, error: e } = await supabase
          .from('media')
          .insert({
            novel_id: novelId,
            chapter_id: null,
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
    setUploading(false)
    if (created.length) {
      setMedia((m) => [...created, ...m])
      success(`تم رفع ${created.length} ملف`)
    }
  }

  const uploadAudioFiles = async (files: File[]) => {
    if (!user || !novelId || !files.length) return
    setUploading(true)
    const created: AudioTrack[] = []
    for (const file of files) {
      try {
        const res = await uploadFile('audio', file, { userId: user.id, novelId })
        const duration = await readAudioDuration(file)
        const { data, error: e } = await supabase
          .from('audio_tracks')
          .insert({
            novel_id: novelId,
            chapter_id: null,
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
    setUploading(false)
    if (created.length) {
      setAudio((a) => [...created, ...a])
      success(`تم رفع ${created.length} مقطع صوتي`)
    }
  }

  /* ------------------------------ الحذف ------------------------------ */
  const requestDelete = (kind: Tab, id: string, name: string) => {
    setToDelete({ kind, id, name, used: usage[id] ?? [] })
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      if (toDelete.kind === 'audio') {
        const item = audio.find((a) => a.id === toDelete.id)
        if (item) await removeFile('audio', item.path)
        const { error: e } = await supabase.from('audio_tracks').delete().eq('id', toDelete.id)
        if (e) throw e
        setAudio((a) => a.filter((x) => x.id !== toDelete.id))
      } else {
        const item = media.find((m) => m.id === toDelete.id)
        if (item) await removeFile('chapter-media', item.path)
        const { error: e } = await supabase.from('media').delete().eq('id', toDelete.id)
        if (e) throw e
        setMedia((m) => m.filter((x) => x.id !== toDelete.id))
      }
      success('تم حذف الملف')
    } catch (err: any) {
      error(err?.message || 'تعذّر حذف الملف')
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  /* ------------------------------ الاستبدال ------------------------------ */
  const startReplace = (kind: Tab, id: string) => {
    setReplacing({ kind, id })
    replaceInput.current?.click()
  }

  const doReplace = async (file: File) => {
    if (!replacing || !user || !novelId) return
    setUploading(true)
    try {
      if (replacing.kind === 'audio') {
        const old = audio.find((a) => a.id === replacing.id)
        if (!old) return
        const res = await uploadFile('audio', file, { userId: user.id, novelId })
        const duration = await readAudioDuration(file)
        const { data, error: e } = await supabase
          .from('audio_tracks')
          .update({
            bucket: 'audio',
            path: res.path,
            url: res.url,
            mime_type: res.mimeType,
            size_bytes: res.size,
            duration,
          })
          .eq('id', old.id)
          .select('*')
          .single()
        if (e) throw e
        await removeFile('audio', old.path).catch(() => {})
        setAudio((a) => a.map((x) => (x.id === old.id ? (data as AudioTrack) : x)))
      } else {
        const old = media.find((m) => m.id === replacing.id)
        if (!old) return
        const res = await uploadFile('chapter-media', file, { userId: user.id, novelId })
        const dims = await readImageSize(file)
        const type = isGif(file) ? 'gif' : 'image'
        const { data, error: e } = await supabase
          .from('media')
          .update({
            type,
            bucket: 'chapter-media',
            path: res.path,
            url: res.url,
            name: res.name,
            mime_type: res.mimeType,
            size_bytes: res.size,
            metadata: dims,
          })
          .eq('id', old.id)
          .select('*')
          .single()
        if (e) throw e
        await removeFile('chapter-media', old.path).catch(() => {})
        setMedia((m) => m.map((x) => (x.id === old.id ? (data as Media) : x)))
      }
      success('تم استبدال الملف')
    } catch (err: any) {
      error(err?.message || 'تعذّر استبدال الملف')
    } finally {
      setUploading(false)
      setReplacing(null)
    }
  }

  /* ------------------------------ إعادة التسمية ------------------------------ */
  const saveRename = async () => {
    if (!renaming || !renameValue.trim()) return
    const { error: e } = await supabase
      .from('audio_tracks')
      .update({ name: renameValue.trim() })
      .eq('id', renaming.id)
    if (e) {
      error('تعذّر إعادة التسمية')
      return
    }
    setAudio((a) => a.map((x) => (x.id === renaming.id ? { ...x, name: renameValue.trim() } : x)))
    setRenaming(null)
    success('تم تحديث الاسم')
  }

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      success('تم نسخ الرابط — يمكنك إعادة استخدامه في أي فصل')
    } catch {
      error('تعذّر النسخ')
    }
  }

  if (loading) return <PageLoader />

  const tabs: { key: Tab; label: string; count: number; icon: typeof ImageIcon }[] = [
    { key: 'image', label: 'الصور', count: images.length, icon: ImageIcon },
    { key: 'gif', label: 'الصور المتحركة', count: gifs.length, icon: Sparkles },
    { key: 'audio', label: 'الصوت', count: audio.length, icon: Music },
  ]

  return (
    <div className="container-app py-8">
      {/* الرأس */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to={`/dashboard/novels/${novelId}`} className="btn-ghost btn-sm">
          <ArrowRight className="h-4 w-4" /> رجوع للرواية
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold text-ink-900 dark:text-parchment-100">
            مدير الوسائط
          </h1>
          <p className="truncate text-xs text-ink-400">{novel?.title}</p>
        </div>
      </div>

      {/* التبويبات */}
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition',
                tab === t.key
                  ? 'border-gold-400 bg-gold-50 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300'
                  : 'border-ink-100 text-ink-600 hover:border-gold-300 dark:border-ink-800 dark:text-ink-300',
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span className="rounded-full bg-ink-100 px-2 text-[11px] dark:bg-ink-800">{t.count}</span>
            </button>
          )
        })}
      </div>

      {/* شريط الرفع */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {tab === 'image' && (
          <>
            <input
              ref={imageInput}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                uploadImages(Array.from(e.target.files ?? []))
                e.target.value = ''
              }}
            />
            <button className="btn-gold" onClick={() => imageInput.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              رفع صور
            </button>
          </>
        )}
        {tab === 'gif' && (
          <>
            <input
              ref={gifInput}
              type="file"
              accept="image/gif,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                uploadImages(Array.from(e.target.files ?? []), true)
                e.target.value = ''
              }}
            />
            <button className="btn-gold" onClick={() => gifInput.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              رفع صور متحركة (GIF/WebP)
            </button>
          </>
        )}
        {tab === 'audio' && (
          <>
            <input
              ref={audioInput}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/m4a,audio/ogg,audio/webm"
              multiple
              className="hidden"
              onChange={(e) => {
                uploadAudioFiles(Array.from(e.target.files ?? []))
                e.target.value = ''
              }}
            />
            <button className="btn-gold" onClick={() => audioInput.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              رفع مقاطع صوتية
            </button>
          </>
        )}
        <input
          ref={replaceInput}
          type="file"
          className="hidden"
          accept={
            replacing?.kind === 'audio'
              ? 'audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/m4a,audio/ogg,audio/webm'
              : 'image/*'
          }
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) doReplace(f)
            e.target.value = ''
          }}
        />
        <p className="text-xs text-ink-400">
          الملفات المرفوعة هنا تُحفظ في مكتبة الرواية ويمكن إعادة استخدامها في أي فصل.
        </p>
      </div>

      {/* المحتوى */}
      {tab === 'audio' ? (
        audio.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {audio.map((a) => (
              <div key={a.id} className="card p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-800 dark:text-ink-100">{a.name}</p>
                    <p className="text-[11px] text-ink-400">
                      {formatDuration(a.duration)} · {formatBytes(a.size_bytes)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      className="btn-ghost btn-sm"
                      title="إعادة تسمية"
                      onClick={() => {
                        setRenaming(a)
                        setRenameValue(a.name)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="btn-ghost btn-sm"
                      title="استبدال"
                      onClick={() => startReplace('audio', a.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      className="btn-ghost btn-sm"
                      title="نسخ الرابط"
                      onClick={() => copyUrl(a.url)}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      className="btn-ghost btn-sm text-red-500"
                      title="حذف"
                      onClick={() => requestDelete('audio', a.id, a.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <AudioPlayer src={a.url} name={a.name} />
                <UsageBadges used={usage[a.id] ?? []} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileAudio className="h-6 w-6" />}
            title="لا توجد مقاطع صوتية"
            description="ارفع ملفات MP3 / WAV / M4A / OGG / WEBM ثم استخدمها كعناصر داخل الفصول."
          />
        )
      ) : (tab === 'image' ? images : gifs).length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(tab === 'image' ? images : gifs).map((m) => (
            <div key={m.id} className="card overflow-hidden">
              <button
                className="block w-full"
                onClick={() => setPreview(m)}
                title="معاينة"
              >
                <img
                  src={m.url}
                  alt={m.name || ''}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              </button>
              <div className="p-2">
                <p className="truncate text-xs text-ink-600 dark:text-ink-300">{m.name}</p>
                <p className="text-[11px] text-ink-400">{formatBytes(m.size_bytes)}</p>
                <div className="mt-1.5 flex gap-1">
                  <button className="btn-ghost btn-sm" title="معاينة" onClick={() => setPreview(m)}>
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    className="btn-ghost btn-sm"
                    title="استبدال"
                    onClick={() => startReplace(m.type, m.id)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button className="btn-ghost btn-sm" title="نسخ الرابط" onClick={() => copyUrl(m.url)}>
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    className="btn-ghost btn-sm text-red-500"
                    title="حذف"
                    onClick={() => requestDelete(m.type, m.id, m.name || 'ملف')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <UsageBadges used={usage[m.id] ?? []} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ImageIcon className="h-6 w-6" />}
          title={tab === 'gif' ? 'لا توجد صور متحركة' : 'لا توجد صور'}
          description={
            tab === 'gif'
              ? 'ارفع صور GIF أو WebP متحركة — نحفظ الأصل دون تحويل حتى لا تفقد الحركة.'
              : 'ارفع صور JPG / PNG / WEBP ثم ضعها داخل الفصول كما تشاء.'
          }
        />
      )}

      {/* معاينة الصورة */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || 'معاينة'} size="xl">
        {preview && (
          <div className="flex flex-col items-center gap-3">
            <img src={preview.url} alt={preview.name || ''} className="max-h-[70vh] w-auto rounded-xl" />
            <p className="text-xs text-ink-400">
              {formatBytes(preview.size_bytes)}
              {preview.metadata && (preview.metadata as any).width
                ? ` · ${(preview.metadata as any).width}×${(preview.metadata as any).height}`
                : ''}
            </p>
          </div>
        )}
      </Modal>

      {/* إعادة تسمية الصوت */}
      <Modal
        open={!!renaming}
        onClose={() => setRenaming(null)}
        title="إعادة تسمية المقطع"
        size="sm"
        footer={
          <>
            <button className="btn-outline" onClick={() => setRenaming(null)}>
              إلغاء
            </button>
            <button className="btn-gold" onClick={saveRename}>
              حفظ
            </button>
          </>
        }
      >
        <label className="label">اسم المقطع (يظهر فوق المشغّل للقارئ)</label>
        <input
          className="input"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          placeholder="مثال: الراوي، المطر، موسيقى التوتر"
          autoFocus
        />
      </Modal>

      {/* تأكيد الحذف */}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        danger
        title="حذف الملف"
        confirmLabel="حذف"
        message={
          toDelete
            ? toDelete.used.length
              ? `تحذير: هذا الملف مستخدم في ${toDelete.used.length} موضع داخل الفصول (${toDelete.used
                  .map((u) => `الفصل ${u.chapterNumber}`)
                  .join('، ')}). سيظهر مكانه فارغًا بعد الحذف. هل تريد المتابعة؟`
              : `سيتم حذف «${toDelete.name}» نهائيًا من المكتبة والتخزين.`
            : ''
        }
      />
    </div>
  )
}

function UsageBadges({ used }: { used: Usage[] }) {
  if (!used.length) {
    return <p className="mt-1.5 text-[11px] text-ink-400">غير مستخدم في أي فصل بعد</p>
  }
  const unique = Array.from(new Map(used.map((u) => [u.chapterId, u])).values())
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {unique.map((u) => (
        <span
          key={u.chapterId}
          className="rounded-full bg-sage-100 px-2 py-0.5 text-[10px] text-sage-700 dark:bg-sage-500/15 dark:text-sage-300"
        >
          الفصل {u.chapterNumber}
        </span>
      ))}
    </div>
  )
}
