import { cn } from '../../lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
      role="status"
      aria-label="جارٍ التحميل"
    />
  )
}

export function PageLoader({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-ink-500 dark:text-ink-400">
      <Spinner className="h-7 w-7 text-gold-500" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
