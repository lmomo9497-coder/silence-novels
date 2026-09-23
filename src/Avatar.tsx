import { cn, getInitials } from '../../lib/utils'

export function Avatar({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string | null
  name?: string | null
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold-100 font-semibold text-gold-700 dark:bg-gold-500/20 dark:text-gold-300',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {src ? (
        <img src={src} alt={name || ''} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        getInitials(name)
      )}
    </span>
  )
}
