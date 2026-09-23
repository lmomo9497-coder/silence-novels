import { supabase } from './supabase'
import type {
  AudioTrack,
  Category,
  Chapter,
  ChapterBlock,
  Character,
  Media,
  Novel,
  Tag,
} from './types'
import { PAGE_SIZE } from './constants'

const NOVEL_SELECT = `
  *,
  category:categories(*),
  chapters:chapters(id, chapter_number, title, slug, is_published, published_at, updated_at, views)
`

export interface NovelQuery {
  search?: string
  categoryId?: string | null
  language?: string | null
  status?: string | null
  sort?: 'latest' | 'updated' | 'views' | 'az'
  page?: number
  pageSize?: number
  authorId?: string | null
  includeUnpublished?: boolean
  tagSlug?: string | null
}

export async function fetchNovels(q: NovelQuery = {}): Promise<{ novels: Novel[]; count: number }> {
  const page = q.page ?? 1
  const pageSize = q.pageSize ?? PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase.from('novels').select(NOVEL_SELECT, { count: 'exact' })

  if (!q.includeUnpublished) query = query.eq('is_published', true)
  if (q.authorId) query = query.eq('author_id', q.authorId)
  if (q.categoryId) query = query.eq('category_id', q.categoryId)
  if (q.language) query = query.eq('language', q.language)
  if (q.status) query = query.eq('status', q.status)
  if (q.search) {
    const s = q.search.replace(/[%,]/g, '')
    query = query.or(`title.ilike.%${s}%,author_name.ilike.%${s}%,description.ilike.%${s}%`)
  }

  switch (q.sort) {
    case 'views':
      query = query.order('views', { ascending: false })
      break
    case 'updated':
      query = query.order('last_chapter_at', { ascending: false, nullsFirst: false })
      break
    case 'az':
      query = query.order('title', { ascending: true })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw error

  let novels = (data ?? []) as unknown as Novel[]
  // ترتيب الفصول تصاعديًا داخل كل رواية
  novels = novels.map((n) => ({
    ...n,
    chapters: (n.chapters ?? []).slice().sort((a, b) => a.chapter_number - b.chapter_number),
  }))

  // فلترة بالوسم (بعد الجلب لأنها علاقة many-to-many)
  if (q.tagSlug) {
    const { data: tag } = await supabase.from('tags').select('id').eq('slug', q.tagSlug).maybeSingle()
    if (tag) {
      const { data: nt } = await supabase.from('novel_tags').select('novel_id').eq('tag_id', tag.id)
      const allowed = new Set((nt ?? []).map((r: any) => r.novel_id))
      novels = novels.filter((n) => allowed.has(n.id))
    }
  }

  return { novels, count: count ?? novels.length }
}

export async function fetchNovelBySlug(slug: string): Promise<Novel | null> {
  const { data, error } = await supabase
    .from('novels')
    .select(NOVEL_SELECT)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const novel = data as unknown as Novel
  novel.chapters = (novel.chapters ?? []).slice().sort((a, b) => a.chapter_number - b.chapter_number)
  const { data: tags } = await supabase
    .from('novel_tags')
    .select('tag:tags(*)')
    .eq('novel_id', novel.id)
  novel.tags = (tags ?? []).map((t: any) => t.tag).filter(Boolean)
  return novel
}

export async function fetchNovelById(id: string): Promise<Novel | null> {
  const { data, error } = await supabase
    .from('novels')
    .select(NOVEL_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const novel = data as unknown as Novel
  novel.chapters = (novel.chapters ?? []).slice().sort((a, b) => a.chapter_number - b.chapter_number)
  const { data: tags } = await supabase
    .from('novel_tags')
    .select('tag:tags(*)')
    .eq('novel_id', novel.id)
  novel.tags = (tags ?? []).map((t: any) => t.tag).filter(Boolean)
  return novel
}

export async function fetchChapters(
  novelId: string,
  includeUnpublished = false,
): Promise<Chapter[]> {
  let query = supabase
    .from('chapters')
    .select('*')
    .eq('novel_id', novelId)
    .order('chapter_number', { ascending: true })
  if (!includeUnpublished) query = query.eq('is_published', true)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Chapter[]
}

export async function fetchChapterBySlug(
  novelId: string,
  chapterSlug: string,
): Promise<Chapter | null> {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('novel_id', novelId)
    .eq('slug', chapterSlug)
    .maybeSingle()
  if (error) throw error
  return (data as Chapter) ?? null
}

export async function fetchChapterById(id: string): Promise<Chapter | null> {
  const { data, error } = await supabase.from('chapters').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Chapter) ?? null
}

export async function fetchBlocks(chapterId: string): Promise<ChapterBlock[]> {
  const { data, error } = await supabase
    .from('chapter_blocks')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('position', { ascending: true })
  if (error) throw error
  return (data ?? []) as ChapterBlock[]
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('position', { ascending: true })
  if (error) throw error
  return (data ?? []) as Category[]
}

export async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await supabase.from('tags').select('*').order('name')
  if (error) throw error
  return (data ?? []) as Tag[]
}

export async function fetchCharacters(novelId: string): Promise<Character[]> {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('novel_id', novelId)
    .order('position', { ascending: true })
  if (error) throw error
  return (data ?? []) as Character[]
}

export async function fetchMedia(novelId: string, type?: 'image' | 'gif'): Promise<Media[]> {
  let query = supabase
    .from('media')
    .select('*')
    .eq('novel_id', novelId)
    .order('created_at', { ascending: false })
  if (type) query = query.eq('type', type)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Media[]
}

export async function fetchAudio(novelId: string): Promise<AudioTrack[]> {
  const { data, error } = await supabase
    .from('audio_tracks')
    .select('*')
    .eq('novel_id', novelId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as AudioTrack[]
}

export async function incrementNovelViews(id: string) {
  try {
    await supabase.rpc('increment_novel_views', { p_id: id })
  } catch {
    /* تجاهل */
  }
}

export async function incrementChapterViews(id: string) {
  try {
    await supabase.rpc('increment_chapter_views', { p_id: id })
  } catch {
    /* تجاهل */
  }
}

export interface LatestChapter {
  id: string
  novel_id: string
  chapter_number: number
  title: string
  slug: string
  published_at: string | null
  views: number
  novel: {
    id: string
    slug: string
    title: string
    cover_url: string | null
    author_name: string
    language: string
    direction: string
  } | null
}

export async function fetchLatestChapters(limit = 12): Promise<LatestChapter[]> {
  const { data, error } = await supabase
    .from('chapters')
    .select(
      'id, novel_id, chapter_number, title, slug, published_at, views, novel:novels(id, slug, title, cover_url, author_name, language, direction)',
    )
    .eq('is_published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as LatestChapter[]
}

/** إحصائيات لوحة الإدارة */
export async function fetchStats() {
  const [novels, chapters, users, media] = await Promise.all([
    supabase.from('novels').select('id', { count: 'exact', head: true }),
    supabase.from('chapters').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('media').select('id', { count: 'exact', head: true }),
  ])
  const { data: viewsData } = await supabase.from('novels').select('views')
  const totalViews = (viewsData ?? []).reduce((s: number, r: any) => s + Number(r.views || 0), 0)
  return {
    novels: novels.count ?? 0,
    chapters: chapters.count ?? 0,
    users: users.count ?? 0,
    media: media.count ?? 0,
    views: totalViews,
  }
}
