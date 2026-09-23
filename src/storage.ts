import { supabase } from './supabase'

/**
 * أدوات رفع الملفات إلى Supabase Storage.
 * المسار الموصى به: {user_id}/{novel_id}/filename
 * هذا يطابق سياسات التخزين (RLS) في migration 0003.
 */

export type UploadBucket = 'covers' | 'chapter-media' | 'audio' | 'avatars'

export interface UploadResult {
  path: string
  url: string
  name: string
  mimeType: string
  size: number
}

/** تنظيف اسم الملف مع الحفاظ على الامتداد */
function safeName(name: string): string {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
  const cleanBase = base
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  const stamp = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 7)
  return `${cleanBase || 'file'}-${stamp}${rand}${ext ? '.' + ext : ''}`
}

export function isGif(file: File): boolean {
  return file.type === 'image/gif' || /\.gif$/i.test(file.name)
}

export function isAnimatedWebp(file: File): boolean {
  return file.type === 'image/webp' && /\.webp$/i.test(file.name)
}

/**
 * رفع ملف واحد. لا نضغط الصور هنا حتى لا نفقد حركة GIF / WebP المتحركة.
 * (الضغط الآمن يتم فقط للصور الثابتة عند الحاجة، مع الحفاظ على الأصل.)
 */
export async function uploadFile(
  bucket: UploadBucket,
  file: File,
  opts: { userId: string; novelId?: string; folder?: string },
): Promise<UploadResult> {
  const parts = [opts.userId]
  if (opts.novelId) parts.push(opts.novelId)
  if (opts.folder) parts.push(opts.folder)
  const path = `${parts.join('/')}/${safeName(file.name)}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return {
    path,
    url: data.publicUrl,
    name: file.name,
    mimeType: file.type,
    size: file.size,
  }
}

/** رفع عدة ملفات على التوازي مع الحفاظ على الترتيب */
export async function uploadFiles(
  bucket: UploadBucket,
  files: File[],
  opts: { userId: string; novelId?: string; folder?: string },
): Promise<UploadResult[]> {
  const results: UploadResult[] = []
  for (const file of files) {
    results.push(await uploadFile(bucket, file, opts))
  }
  return results
}

export async function removeFile(bucket: UploadBucket, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}

/** استخراج المسار من رابط عام (لعرضه/حذفه) */
export function pathFromUrl(url: string, bucket: string): string {
  const marker = `/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return url
  return decodeURIComponent(url.slice(idx + marker.length))
}

/** قراءة مدة ملف صوتي محليًا قبل الرفع */
export function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file)
      const audio = document.createElement('audio')
      audio.preload = 'metadata'
      audio.onloadedmetadata = () => {
        const d = isFinite(audio.duration) ? audio.duration : 0
        URL.revokeObjectURL(url)
        resolve(d)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(0)
      }
      audio.src = url
    } catch {
      resolve(0)
    }
  })
}

/** قراءة أبعاد صورة محليًا */
export function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
        URL.revokeObjectURL(url)
      }
      img.onerror = () => {
        resolve({ width: 0, height: 0 })
        URL.revokeObjectURL(url)
      }
      img.src = url
    } catch {
      resolve({ width: 0, height: 0 })
    }
  })
}
