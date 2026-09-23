import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Check, Loader2, Palette, Plus, Trash2, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { PageLoader } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { CHARACTER_COLORS } from '../../lib/constants'
import { cn } from '../../lib/utils'
import type { Character, Novel } from '../../lib/types'

export default function CharacterManager() {
  const { novelId } = useParams()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [novel, setNovel] = useState<Novel | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState(CHARACTER_COLORS[0])
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    if (!novelId) return
    setLoading(true)
    const [{ data: n }, { data: chars }] = await Promise.all([
      supabase.from('novels').select('*').eq('id', novelId).maybeSingle(),
      supabase.from('characters').select('*').eq('novel_id', novelId).order('position'),
    ])
    setNovel((n as Novel) ?? null)
    setCharacters((chars ?? []) as Character[])
    setLoading(false)
  }, [novelId])

  useEffect(() => {
    load()
  }, [load])

  const add = async () => {
    if (!novelId || !name.trim()) return
    setAdding(true)
    const position = characters.length
    const { data, error: e } = await supabase
      .from('characters')
      .insert({ novel_id: novelId, name: name.trim(), color, position })
      .select('*')
      .single()
    setAdding(false)
    if (e || !data) {
      error('تعذّر إضافة الشخصية')
      return
    }
    setCharacters((c) => [...c, data as Character])
    setName('')
    setColor(CHARACTER_COLORS[(characters.length + 1) % CHARACTER_COLORS.length])
    success('تمت إضافة الشخصية')
  }

  const update = async (id: string, patch: Partial<Character>) => {
    setCharacters((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    const { error: e } = await supabase.from('characters').update(patch).eq('id', id)
    if (e) {
      error('تعذّر حفظ التعديل')
      load()
    }
  }

  const remove = async (id: string) => {
    if (!confirm('حذف هذه الشخصية؟')) return
    const { error: e } = await supabase.from('characters').delete().eq('id', id)
    if (e) {
      error('تعذّر حذف الشخصية')
      return
    }
    setCharacters((cs) => cs.filter((c) => c.id !== id))
    success('تم حذف الشخصية')
  }

  if (loading) return <PageLoader />

  return (
    <div className="container-app py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to={`/dashboard/novels/${novelId}`} className="btn-ghost btn-sm">
          <ArrowRight className="h-4 w-4" /> رجوع للرواية
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900 dark:text-parchment-100">
            مدير الشخصيات
          </h1>
          <p className="text-xs text-ink-400">{novel?.title}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* إضافة شخصية */}
        <div className="card space-y-4 p-5 lg:sticky lg:top-20 lg:self-start">
          <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink-900 dark:text-parchment-100">
            <Plus className="h-5 w-5 text-gold-500" /> شخصية جديدة
          </h2>
          <div>
            <label className="label">اسم الشخصية</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="مثال: سليم"
            />
          </div>
          <div>
            <label className="label inline-flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" /> لون الشخصية
            </label>
            <div className="flex flex-wrap gap-2">
              {CHARACTER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-white transition dark:ring-offset-ink-900',
                    color === c ? 'ring-ink-900 dark:ring-gold-400' : 'ring-transparent',
                  )}
                  style={{ background: c }}
                  aria-label={`لون ${c}`}
                >
                  {color === c && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-ink-400">
              ألوان هادئة مريحة للعين. يمكنك أيضًا تلوين النص يدويًا من محرر الفصل.
            </p>
          </div>
          <button className="btn-gold w-full" onClick={add} disabled={adding || !name.trim()}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            إضافة الشخصية
          </button>
        </div>

        {/* القائمة */}
        <div>
          {!characters.length ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="لا توجد شخصيات بعد"
              description="أضف شخصيات روايتك وألوانها، ثم استخدمها لتلوين أسماء الشخصيات داخل الفصل."
            />
          ) : (
            <div className="space-y-2">
              {characters.map((c) => (
                <div
                  key={c.id}
                  className="card flex flex-wrap items-center gap-3 p-3"
                >
                  <span className="h-9 w-9 shrink-0 rounded-full" style={{ background: c.color }} />
                  <input
                    className="input min-w-[8rem] flex-1"
                    value={c.name}
                    onChange={(e) => update(c.id, { name: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {CHARACTER_COLORS.map((col) => (
                      <button
                        key={col}
                        onClick={() => update(c.id, { color: col })}
                        className={cn(
                          'h-6 w-6 rounded-full ring-2 ring-offset-1 ring-offset-white transition dark:ring-offset-ink-900',
                          c.color === col ? 'ring-ink-900 dark:ring-gold-400' : 'ring-transparent',
                        )}
                        style={{ background: col }}
                        aria-label={`لون ${col}`}
                      />
                    ))}
                  </div>
                  <button
                    className="btn-ghost btn-sm text-red-600"
                    onClick={() => remove(c.id)}
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
