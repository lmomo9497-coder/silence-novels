import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * إعداد Supabase لمشروع "روايات صمت" — مستقل بالكامل.
 * يدعم مصدرين للإعداد:
 *   1) متغيرات البيئة وقت البناء (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 *   2) إعداد وقت التشغيل يُحفظ محليًا (لتسهيل النشر دون إعادة بناء)
 */

const LS_KEY = 'silence_novels_supabase_config'

export interface SupabaseConfig {
  url: string
  key: string
}

export function getStoredConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.url && parsed?.key) return parsed
  } catch {
    /* ignore */
  }
  return null
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (envUrl && envKey) return { url: envUrl, key: envKey }
  return getStoredConfig()
}

export function saveSupabaseConfig(url: string, key: string) {
  localStorage.setItem(LS_KEY, JSON.stringify({ url: url.trim(), key: key.trim() }))
}

export function clearSupabaseConfig() {
  localStorage.removeItem(LS_KEY)
}

const config = getSupabaseConfig()

export const isSupabaseConfigured = Boolean(config)

export const supabase: SupabaseClient = config
  ? createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'silence-novels-auth',
      },
    })
  : (null as unknown as SupabaseClient)

/** الحصول على رابط عام لملف داخل Storage */
export function publicUrl(bucket: string, path: string): string {
  if (!supabase || !path) return ''
  if (path.startsWith('http')) return path
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
