import { useRef, useState } from 'react'
import { Loader2, Music, Upload } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { AudioPlayer } from '../reader/AudioPlayer'
import { cn, formatBytes } from '../../lib/utils'
import type { AudioTrack, Media } from '../../lib/types'

/** منتقي الصور / الصور المتحركة من مكتبة الوسائط */
export function MediaPicker({
  open,
  onClose,
  type,
  items,
  onSelect,
  onUpload,
}: {
  open: boolean
  onClose: () => void
  type: 'image' | 'gif'
  items: Media[]
  onSelect: (m: Media) => void
  onUpload: (files: File[]) => Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const filtered = items.filter((m) => m.type === type)

  const handleFiles = async (files: File[]) => {
    if (!files.length) return
    setUploading(true)
    try {
      await onUpload(files)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={type === 'gif' ? 'اختر صورة متحركة' : 'اختر صورة'}
      size="lg"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            إغلاق
          </button>
          <button className="btn-gold" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            رفع ملفات جديدة
          </button>
        </>
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept={type === 'gif' ? 'image/gif,image/webp' : 'image/*'}
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          handleFiles(files)
          e.target.value = ''
        }}
      />
      {!filtered.length ? (
        <div className="rounded-xl border border-dashed border-ink-200 p-10 text-center dark:border-ink-700">
          <p className="text-sm text-ink-500 dark:text-ink-400">
            لا توجد ملفات بعد. ارفع {type === 'gif' ? 'صورًا متحركة (GIF/WebP)' : 'صورًا'} للبدء.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onSelect(m)
                onClose()
              }}
              className="group overflow-hidden rounded-xl border border-ink-100 transition hover:border-gold-400 dark:border-ink-800"
            >
              <img src={m.url} alt={m.name || ''} className="aspect-square w-full object-cover" loading="lazy" />
              <span className="block truncate px-2 py-1 text-[11px] text-ink-500">{m.name}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

/** منتقي المقاطع الصوتية من مكتبة الصوت */
export function AudioPicker({
  open,
  onClose,
  items,
  onSelect,
  onUpload,
}: {
  open: boolean
  onClose: () => void
  items: AudioTrack[]
  onSelect: (a: AudioTrack) => void
  onUpload: (files: File[]) => Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFiles = async (files: File[]) => {
    if (!files.length) return
    setUploading(true)
    try {
      await onUpload(files)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="اختر مقطعًا صوتيًا"
      size="lg"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            إغلاق
          </button>
          <button className="btn-gold" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            رفع مقاطع جديدة
          </button>
        </>
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/m4a,audio/ogg,audio/webm"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          handleFiles(files)
          e.target.value = ''
        }}
      />
      {!items.length ? (
        <div className="rounded-xl border border-dashed border-ink-200 p-10 text-center dark:border-ink-700">
          <Music className="mx-auto mb-2 h-8 w-8 text-ink-300" />
          <p className="text-sm text-ink-500 dark:text-ink-400">
            لا توجد مقاطع صوتية بعد. ارفع ملفات MP3 / WAV / M4A / OGG / WEBM.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div
              key={a.id}
              className={cn(
                'rounded-xl border border-ink-100 p-3 transition hover:border-gold-400 dark:border-ink-800',
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-ink-800 dark:text-ink-100">
                  {a.name}
                </span>
                <span className="shrink-0 text-[11px] text-ink-400">{formatBytes(a.size_bytes)}</span>
              </div>
              <AudioPlayer src={a.url} name={a.name} />
              <button
                className="btn-gold btn-sm mt-2 w-full"
                onClick={() => {
                  onSelect(a)
                  onClose()
                }}
              >
                استخدام هذا المقطع
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
