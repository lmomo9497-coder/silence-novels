import { cn } from '../../lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('h-9 w-9', className)} aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d4a94f" />
          <stop offset="1" stopColor="#9a7344" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" className="fill-ink-900 dark:fill-ink-800" />
      <path
        d="M32 14c-6-3.5-13-4-18-3v34c5-1 12-.5 18 3 6-3.5 13-4 18-3V11c-5-1-12-.5-18 3z"
        fill="none"
        stroke="url(#logo-g)"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path d="M32 14v34" stroke="url(#logo-g)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="32" cy="9" r="2.4" fill="#d4a94f" />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-bold text-ink-900 dark:text-parchment-100">
            روايات صمت
          </span>
          <span className="text-[10px] font-medium tracking-[0.2em] text-gold-600 dark:text-gold-400">
            SILENCE NOVELS
          </span>
        </span>
      )}
    </span>
  )
}
