import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useToast } from '../components/ui/Toast'

interface FavoritesCtx {
  ids: Set<string>
  isFavorite: (novelId: string) => boolean
  toggle: (novelId: string) => Promise<void>
  reload: () => Promise<void>
}

const Ctx = createContext<FavoritesCtx>({
  ids: new Set(),
  isFavorite: () => false,
  toggle: async () => {},
  reload: async () => {},
})

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { success, error } = useToast()
  const [ids, setIds] = useState<Set<string>>(new Set())

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured || !user) {
      setIds(new Set())
      return
    }
    const { data } = await supabase.from('favorites').select('novel_id').eq('user_id', user.id)
    setIds(new Set((data ?? []).map((r: any) => r.novel_id)))
  }, [user])

  useEffect(() => {
    reload()
  }, [reload])

  const isFavorite = useCallback((id: string) => ids.has(id), [ids])

  const toggle = useCallback(
    async (novelId: string) => {
      if (!user) {
        error('سجّل الدخول لإضافة الروايات إلى المفضلة')
        return
      }
      const currently = ids.has(novelId)
      // تحديث تفاؤلي
      setIds((prev) => {
        const next = new Set(prev)
        if (currently) next.delete(novelId)
        else next.add(novelId)
        return next
      })
      if (currently) {
        const { error: e } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('novel_id', novelId)
        if (e) {
          error('تعذّر إزالة المفضلة')
          reload()
        } else success('أُزيلت من المفضلة')
      } else {
        const { error: e } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, novel_id: novelId })
        if (e) {
          error('تعذّر الإضافة للمفضلة')
          reload()
        } else success('أُضيفت إلى المفضلة')
      }
    },
    [user, ids, reload, success, error],
  )

  return <Ctx.Provider value={{ ids, isFavorite, toggle, reload }}>{children}</Ctx.Provider>
}

export const useFavorites = () => useContext(Ctx)
