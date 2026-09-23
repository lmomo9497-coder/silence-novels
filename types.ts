export type Role = 'owner' | 'staff' | 'reader'
export type NovelStatus = 'ongoing' | 'completed'
export type Direction = 'rtl' | 'ltr'
export type AccessType = 'free' | 'paid'
export type BlockType = 'text' | 'heading' | 'image' | 'gif' | 'audio' | 'quote' | 'divider'
export type MediaType = 'image' | 'gif'

export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  role: Role
  is_banned: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  slug: string
  name_ar: string
  name_en: string
  description: string | null
  position: number
  created_at: string
}

export interface Tag {
  id: string
  slug: string
  name: string
  created_at: string
}

export interface Novel {
  id: string
  slug: string
  title: string
  author_name: string
  author_id: string | null
  description: string | null
  language: string
  direction: Direction
  category_id: string | null
  status: NovelStatus
  cover_url: string | null
  is_published: boolean
  is_flagged: boolean
  views: number
  created_at: string
  updated_at: string
  last_chapter_at: string | null
  // علاقات اختيارية عند الجلب
  category?: Category | null
  tags?: Tag[]
  chapters?: Chapter[]
}

export interface Chapter {
  id: string
  novel_id: string
  chapter_number: number
  title: string
  slug: string
  is_published: boolean
  published_at: string | null
  views: number
  access_type: AccessType
  price: number
  created_at: string
  updated_at: string
  blocks?: ChapterBlock[]
}

export interface ChapterBlock {
  id: string
  chapter_id: string
  type: BlockType
  content: string | null
  position: number
  metadata: BlockMetadata
  created_at?: string
  updated_at?: string
}

export interface BlockMetadata {
  alt?: string
  caption?: string
  audio_name?: string
  media_id?: string
  audio_id?: string
  align?: 'right' | 'center' | 'left'
  size?: 'small' | 'medium' | 'large' | 'full'
  level?: 1 | 2 | 3
  [key: string]: unknown
}

export interface Character {
  id: string
  novel_id: string
  name: string
  color: string
  position: number
  created_at: string
}

export interface Media {
  id: string
  novel_id: string
  chapter_id: string | null
  owner_id: string | null
  type: MediaType
  bucket: string
  path: string
  url: string
  name: string | null
  mime_type: string | null
  size_bytes: number | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface AudioTrack {
  id: string
  novel_id: string
  chapter_id: string | null
  owner_id: string | null
  name: string
  bucket: string
  path: string
  url: string
  mime_type: string | null
  size_bytes: number | null
  duration: number | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Favorite {
  user_id: string
  novel_id: string
  created_at: string
  novel?: Novel
}

export interface ReadingProgress {
  user_id: string
  novel_id: string
  chapter_id: string | null
  scroll_percent: number
  block_index: number
  updated_at: string
}

export interface ReadingHistoryItem {
  id: string
  user_id: string
  novel_id: string
  chapter_id: string | null
  read_at: string
  novel?: Novel
  chapter?: Chapter
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface Permission {
  id: string
  name_ar: string
  name_en: string
  description: string | null
}

export interface RoleRow {
  id: Role
  name_ar: string
  name_en: string
  level: number
}
