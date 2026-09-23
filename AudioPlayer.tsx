import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Music } from 'lucide-react'
import { cn, formatDuration } from '../../lib/utils'

/**
 * مشغل صوت مخصص. لا يشغّل الصوت تلقائيًا — يتطلب ضغط القارئ.
 */
export function AudioPlayer({ src, name }: { src: string; name?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setCurrent(a.currentTime)
    const onMeta = () => setDuration(a.duration || 0)
    const onEnd = () => setPlaying(false)
    const onErr = () => setError(true)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('ended', onEnd)
    a.addEventListener('error', onErr)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('ended', onEnd)
      a.removeEventListener('error', onErr)
    }
  }, [src])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume
  }, [volume, muted])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      a.play().then(() => setPlaying(true)).catch(() => setError(true))
    }
  }

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current
    if (!a) return
    const t = Number(e.target.value)
    a.currentTime = t
    setCurrent(t)
  }

  const pct = duration ? (current / duration) * 100 : 0

  return (
    <div className="my-5 overflow-hidden rounded-2xl border border-ink-100 bg-gradient-to-br from-ink-50 to-white p-4 dark:border-ink-800 dark:from-ink-900 dark:to-ink-900/50">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-100 text-gold-600 dark:bg-gold-500/15 dark:text-gold-400">
          <Music className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-ink-400">مقطع صوتي</p>
          <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
            {name || 'صوت'}
          </p>
        </div>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
          تعذّر تحميل الملف الصوتي.
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-900 text-parchment-50 transition hover:bg-ink-800 active:scale-95 dark:bg-gold-500 dark:text-ink-950 dark:hover:bg-gold-400"
            aria-label={playing ? 'إيقاف' : 'تشغيل'}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ps-0.5" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-ink-200 dark:bg-ink-700">
              <div
                className="absolute inset-y-0 start-0 rounded-full bg-gold-500"
                style={{ width: `${pct}%` }}
              />
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={current}
                onChange={seek}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="شريط التقدم"
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] tabular-nums text-ink-400">
              <span>{formatDuration(current)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          <div className="hidden items-center gap-1.5 sm:flex">
            <button
              onClick={() => setMuted((m) => !m)}
              className="text-ink-400 hover:text-ink-700 dark:hover:text-ink-200"
              aria-label={muted ? 'إلغاء الكتم' : 'كتم'}
            >
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value))
                setMuted(false)
              }}
              className={cn('h-1.5 w-16 cursor-pointer accent-gold-500')}
              aria-label="مستوى الصوت"
            />
          </div>
        </div>
      )}
    </div>
  )
}
