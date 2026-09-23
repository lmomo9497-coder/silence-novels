import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** إنشاء slug يدعم العربية واللاتينية */
export function slugify(input: string): string {
  return (input || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** slug فريد بإضافة لاحقة قصيرة */
export function uniqueSlug(input: string): string {
  const base = slugify(input) || 'item'
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base}-${suffix}`
}

export function formatNumber(n: number | null | undefined): string {
  const v = Number(n || 0)
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(v)
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  try {
    return new Intl.DateTimeFormat('ar', { year: 'numeric', month: 'long', day: 'numeric' }).format(
      new Date(date),
    )
  } catch {
    return '—'
  }
}

export function timeAgo(date: string | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date).getTime()
  const diff = Date.now() - d
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `قبل ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `قبل ${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days < 30) return `قبل ${days} يوم`
  const months = Math.floor(days / 30)
  if (months < 12) return `قبل ${months} شهر`
  return `قبل ${Math.floor(months / 12)} سنة`
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function excerpt(text: string | null | undefined, len = 160): string {
  const t = stripHtml(text)
  if (t.length <= len) return t
  return t.slice(0, len).trim() + '…'
}

export function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text)
}

/** التحقق من المحتوى غير المناسب (فحص إشراف أساسي) */
const BANNED_PATTERNS = [
  /\b(sex|porn|xxx|nude|naked|erotic|hentai|nsfw)\b/i,
  /(إباحي|إباحية|جنسي صريح|عاري|عري|بورنو|سكس)/,
]

export function moderateText(text: string): { flagged: boolean; matches: string[] } {
  const matches: string[] = []
  for (const re of BANNED_PATTERNS) {
    const m = text.match(re)
    if (m) matches.push(m[0])
  }
  return { flagged: matches.length > 0, matches }
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms = 350) {
  let t: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '؟'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2)
  return (parts[0][0] || '') + (parts[1][0] || '')
}

export function readingTime(html: string | null | undefined): string {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length
  const mins = Math.max(1, Math.round(words / 180))
  return `${mins} دقيقة قراءة`
}
