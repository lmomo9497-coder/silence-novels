import type { BlockType, Direction, NovelStatus } from './types'

export const SITE = {
  nameAr: 'روايات صمت',
  nameEn: 'Silence Novels',
  tagline: 'منصة احترافية لقراءة ونشر الروايات',
  description:
    'روايات صمت منصة أدبية لقراءة ونشر الروايات. فصول غنية بالنصوص والصور والأصوات، بتجربة قراءة مريحة على كل الأجهزة.',
}

export const LANGUAGES: { code: string; label: string; direction: Direction }[] = [
  { code: 'ar', label: 'العربية', direction: 'rtl' },
  { code: 'en', label: 'English', direction: 'ltr' },
  { code: 'ko', label: '한국어 (Korean)', direction: 'ltr' },
  { code: 'ja', label: '日本語 (Japanese)', direction: 'ltr' },
  { code: 'zh', label: '中文 (Chinese)', direction: 'ltr' },
  { code: 'fr', label: 'Français', direction: 'ltr' },
  { code: 'es', label: 'Español', direction: 'ltr' },
  { code: 'tr', label: 'Türkçe', direction: 'ltr' },
  { code: 'fa', label: 'فارسی', direction: 'rtl' },
  { code: 'ur', label: 'اردو', direction: 'rtl' },
]

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code
}

export function directionForLanguage(code: string): Direction {
  return LANGUAGES.find((l) => l.code === code)?.direction ?? 'ltr'
}

export const NOVEL_STATUS: { value: NovelStatus; label: string }[] = [
  { value: 'ongoing', label: 'مستمرة' },
  { value: 'completed', label: 'مكتملة' },
]

export function statusLabel(status: NovelStatus): string {
  return NOVEL_STATUS.find((s) => s.value === status)?.label ?? status
}

export const BLOCK_TYPES: { value: BlockType; label: string; icon: string }[] = [
  { value: 'text', label: 'نص', icon: 'Type' },
  { value: 'heading', label: 'عنوان', icon: 'Heading' },
  { value: 'quote', label: 'اقتباس', icon: 'Quote' },
  { value: 'image', label: 'صورة', icon: 'Image' },
  { value: 'gif', label: 'صورة متحركة (GIF)', icon: 'Film' },
  { value: 'audio', label: 'صوت', icon: 'Music' },
  { value: 'divider', label: 'فاصل', icon: 'Minus' },
]

export const CHARACTER_COLORS = [
  '#c8912f', '#4f7f60', '#8a6fb0', '#b06f6f', '#5b7fb0',
  '#b08a4f', '#6f9d7e', '#a06f9d', '#7d8a5b', '#9d6f5b',
  '#5b9d9d', '#9d5b7d', '#6f7fb0', '#b09d4f', '#7d5b9d',
]

export const READING_FONTS = [
  { value: 'reading', label: 'أميري (نسخي)' },
  { value: 'sans', label: 'آي بي إم بلكس (حديث)' },
  { value: 'serif', label: 'سيريف' },
]

export const SORT_OPTIONS = [
  { value: 'latest', label: 'الأحدث' },
  { value: 'updated', label: 'آخر تحديث' },
  { value: 'views', label: 'الأكثر قراءة' },
  { value: 'az', label: 'أبجدي (A-Z)' },
] as const

export const PAGE_SIZE = 24

export const PERMISSIONS = {
  NOVELS: 'novels.manage',
  CHAPTERS: 'chapters.manage',
  MEDIA: 'media.manage',
  CATEGORIES: 'categories.manage',
  USERS: 'users.manage',
  MODERATE: 'content.moderate',
  STATS: 'stats.view',
} as const
