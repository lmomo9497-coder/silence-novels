import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '../../lib/utils'

type ToastType = 'success' | 'error' | 'info'
interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void
  success: (m: string) => void
  error: (m: string) => void
  info: (m: string) => void
}

const Ctx = createContext<ToastCtx>({} as ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, type, message }])
    setTimeout(() => remove(id), 4200)
  }, [])

  const value: ToastCtx = {
    toast,
    success: (m) => toast(m, 'success'),
    error: (m) => toast(m, 'error'),
    info: (m) => toast(m, 'info'),
  }

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-sage-500" />,
    error: <AlertTriangle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-gold-500" />,
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-card animate-fade-in dark:bg-ink-900',
              t.type === 'error'
                ? 'border-red-200 dark:border-red-900/50'
                : t.type === 'success'
                  ? 'border-sage-200 dark:border-sage-800'
                  : 'border-ink-200 dark:border-ink-700',
            )}
          >
            {icons[t.type]}
            <p className="flex-1 text-sm text-ink-800 dark:text-ink-100">{t.message}</p>
            <button onClick={() => remove(t.id)} className="text-ink-400 hover:text-ink-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
