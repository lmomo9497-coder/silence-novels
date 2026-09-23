import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import type { ChapterBlock } from '../../lib/types'
import { cn } from '../../lib/utils'
import { AudioPlayer } from './AudioPlayer'

const SIZE_CLASS: Record<string, string> = {
  small: 'max-w-[240px]',
  medium: 'max-w-md',
  large: 'max-w-2xl',
  full: 'max-w-full',
}

const ALIGN_CLASS: Record<string, string> = {
  right: 'me-auto ms-0',
  center: 'mx-auto',
  left: 'ms-auto me-0',
}

function MediaImage({ block }: { block: ChapterBlock }) {
  const [failed, setFailed] = useState(false)
  const src = block.content || ''
  const { alt, caption, align = 'center', size = 'large' } = block.metadata || {}
  const isGif = block.type === 'gif'

  if (!src || failed) {
    return (
      <figure className="my-5 flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-50 py-10 text-ink-400 dark:border-ink-700 dark:bg-ink-900/40">
        <ImageOff className="mb-2 h-6 w-6" />
        <span className="text-xs">تعذّر عرض الصورة</span>
      </figure>
    )
  }

  return (
    <figure className={cn('my-5', ALIGN_CLASS[align] || 'mx-auto', SIZE_CLASS[size] || 'max-w-2xl')}>
      <img
        src={src}
        alt={alt || caption || ''}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={cn(
          'h-auto w-full rounded-xl border border-ink-100 object-contain dark:border-ink-800',
          isGif && 'bg-ink-50 dark:bg-ink-900',
        )}
      />
      {caption && (
        <figcaption className="mt-2 text-center text-xs text-ink-400">{caption}</figcaption>
      )}
    </figure>
  )
}

export function BlockRenderer({ block }: { block: ChapterBlock }) {
  switch (block.type) {
    case 'text':
      return (
        <div
          className="block-content break-anywhere"
          dangerouslySetInnerHTML={{ __html: block.content || '' }}
        />
      )

    case 'heading': {
      const level = block.metadata?.level ?? 2
      const Tag = (`h${level}` as unknown) as 'h1'
      return (
        <Tag
          className="block-content break-anywhere !mb-3 !mt-8 font-display font-bold"
          dangerouslySetInnerHTML={{ __html: block.content || '' }}
        />
      )
    }

    case 'quote':
      return (
        <blockquote className="block-content break-anywhere my-5 border-e-4 border-gold-400 bg-gold-50/60 px-4 py-3 italic dark:bg-gold-500/10">
          <div dangerouslySetInnerHTML={{ __html: block.content || '' }} />
        </blockquote>
      )

    case 'divider':
      return (
        <div className="my-8 flex items-center justify-center gap-3 text-gold-400">
          <span className="h-px w-16 bg-current opacity-40" />
          <span className="text-lg">❖</span>
          <span className="h-px w-16 bg-current opacity-40" />
        </div>
      )

    case 'image':
    case 'gif':
      return <MediaImage block={block} />

    case 'audio':
      return <AudioPlayer src={block.content || ''} name={block.metadata?.audio_name} />

    default:
      return null
  }
}
