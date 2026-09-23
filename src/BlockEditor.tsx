import { useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Image as ImageIcon,
  Minus,
  Music,
  Plus,
  Quote,
  Trash2,
  Type,
} from 'lucide-react'
import { RichTextEditor } from './RichTextEditor'
import { AudioPlayer } from '../reader/AudioPlayer'
import { cn } from '../../lib/utils'
import type { AudioTrack, BlockMetadata, BlockType, Character, Media } from '../../lib/types'

export interface BlockDraft {
  key: string
  id: string | null // معرّف قاعدة البيانات (null للجديد)
  type: BlockType
  content: string
  metadata: BlockMetadata
}

export function newBlock(type: BlockType): BlockDraft {
  return {
    key: `tmp-${Math.random().toString(36).slice(2)}`,
    id: null,
    type,
    content: '',
    metadata: type === 'heading' ? { level: 2 } : {},
  }
}

const BLOCK_LABELS: Record<BlockType, string> = {
  text: 'نص',
  heading: 'عنوان',
  quote: 'اقتباس',
  image: 'صورة',
  gif: 'صورة متحركة',
  audio: 'صوت',
  divider: 'فاصل',
}

export function BlockEditor({
  blocks,
  onChange,
  characters,
  media,
  audio,
  onRequestMedia,
  onRequestAudio,
}: {
  blocks: BlockDraft[]
  onChange: (blocks: BlockDraft[]) => void
  characters: Character[]
  media: Media[]
  audio: AudioTrack[]
  onRequestMedia: (type: 'image' | 'gif') => void
  onRequestAudio: () => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const ids = useMemo(() => blocks.map((b) => b.key), [blocks])

  const update = (key: string, patch: Partial<BlockDraft>) =>
    onChange(blocks.map((b) => (b.key === key ? { ...b, ...patch } : b)))

  const remove = (key: string) => onChange(blocks.filter((b) => b.key !== key))

  const duplicate = (key: string) => {
    const idx = blocks.findIndex((b) => b.key === key)
    if (idx === -1) return
    const copy: BlockDraft = {
      ...blocks[idx],
      key: `tmp-${Math.random().toString(36).slice(2)}`,
      id: null,
    }
    const next = [...blocks]
    next.splice(idx + 1, 0, copy)
    onChange(next)
  }

  const move = (key: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.key === key)
    const target = idx + dir
    if (target < 0 || target >= blocks.length) return
    onChange(arrayMove(blocks, idx, target))
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = blocks.findIndex((b) => b.key === active.id)
    const newIndex = blocks.findIndex((b) => b.key === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onChange(arrayMove(blocks, oldIndex, newIndex))
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {blocks.map((b, i) => (
            <SortableBlock
              key={b.key}
              block={b}
              index={i}
              total={blocks.length}
              characters={characters}
              media={media}
              audio={audio}
              onUpdate={(patch) => update(b.key, patch)}
              onRemove={() => remove(b.key)}
              onDuplicate={() => duplicate(b.key)}
              onMove={(dir) => move(b.key, dir)}
              onRequestMedia={onRequestMedia}
              onRequestAudio={onRequestAudio}
            />
          ))}
        </SortableContext>
      </DndContext>

      <AddBlockBar onAdd={(t) => onChange([...blocks, newBlock(t)])} />
    </div>
  )
}

function SortableBlock({
  block,
  index,
  total,
  characters,
  media,
  audio,
  onUpdate,
  onRemove,
  onDuplicate,
  onMove,
  onRequestMedia,
  onRequestAudio,
}: {
  block: BlockDraft
  index: number
  total: number
  characters: Character[]
  media: Media[]
  audio: AudioTrack[]
  onUpdate: (patch: Partial<BlockDraft>) => void
  onRemove: () => void
  onDuplicate: () => void
  onMove: (dir: -1 | 1) => void
  onRequestMedia: (type: 'image' | 'gif') => void
  onRequestAudio: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.key,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const selectedMedia = block.metadata.media_id
    ? media.find((m) => m.id === block.metadata.media_id)
    : undefined
  const selectedAudio = block.metadata.audio_id
    ? audio.find((a) => a.id === block.metadata.audio_id)
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-2xl border border-ink-100 bg-white p-3 shadow-soft transition dark:border-ink-800 dark:bg-ink-900',
        isDragging && 'z-10 opacity-80 ring-2 ring-gold-400',
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-ink-300 hover:text-ink-600 active:cursor-grabbing dark:hover:text-ink-200"
          aria-label="اسحب لإعادة الترتيب"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <span className="chip !px-2 !py-0.5 !text-[10px]">{BLOCK_LABELS[block.type]}</span>
        <span className="text-[11px] text-ink-400">#{index + 1}</span>
        <div className="ms-auto flex items-center gap-0.5">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="أعلى"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="أسفل"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
            onClick={onDuplicate}
            aria-label="تكرار"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
            onClick={onRemove}
            aria-label="حذف"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* محتوى البلوك حسب النوع */}
      {block.type === 'text' && (
        <RichTextEditor
          value={block.content}
          onChange={(html) => onUpdate({ content: html })}
          characters={characters}
          placeholder="اكتب نص الفصل…"
        />
      )}

      {block.type === 'quote' && (
        <RichTextEditor
          value={block.content}
          onChange={(html) => onUpdate({ content: html })}
          characters={characters}
          placeholder="اكتب الاقتباس…"
          minHeight="5rem"
        />
      )}

      {block.type === 'heading' && (
        <div className="flex gap-2">
          <select
            className="input w-28 shrink-0"
            value={block.metadata.level ?? 2}
            onChange={(e) => onUpdate({ metadata: { ...block.metadata, level: Number(e.target.value) as 1 | 2 | 3 } })}
          >
            <option value={1}>عنوان 1</option>
            <option value={2}>عنوان 2</option>
            <option value={3}>عنوان 3</option>
          </select>
          <input
            className="input"
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="نص العنوان"
          />
        </div>
      )}

      {block.type === 'divider' && (
        <div className="flex items-center justify-center py-3 text-2xl text-gold-500">❖</div>
      )}

      {(block.type === 'image' || block.type === 'gif') && (
        <MediaBlock
          block={block}
          selected={selectedMedia}
          onUpdate={onUpdate}
          onRequest={() => onRequestMedia(block.type === 'gif' ? 'gif' : 'image')}
        />
      )}

      {block.type === 'audio' && (
        <AudioBlock
          block={block}
          selected={selectedAudio}
          onUpdate={onUpdate}
          onRequest={onRequestAudio}
        />
      )}
    </div>
  )
}

function MediaBlock({
  block,
  selected,
  onUpdate,
  onRequest,
}: {
  block: BlockDraft
  selected?: Media
  onUpdate: (patch: Partial<BlockDraft>) => void
  onRequest: () => void
}) {
  const align = block.metadata.align ?? 'center'
  const size = block.metadata.size ?? 'large'
  const sizeClass =
    size === 'small' ? 'max-w-[220px]' : size === 'medium' ? 'max-w-sm' : size === 'full' ? 'max-w-full' : 'max-w-xl'
  const alignClass = align === 'right' ? 'me-auto' : align === 'left' ? 'ms-auto' : 'mx-auto'

  return (
    <div className="space-y-2">
      {selected ? (
        <div className={cn('overflow-hidden rounded-xl', sizeClass, alignClass)}>
          <img src={selected.url} alt={block.metadata.alt || ''} className="w-full rounded-xl" />
        </div>
      ) : (
        <button
          onClick={onRequest}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-ink-300 py-8 text-ink-400 transition hover:border-gold-400 hover:text-gold-600 dark:border-ink-700"
        >
          <ImageIcon className="h-7 w-7" />
          <span className="text-sm">اختر {block.type === 'gif' ? 'صورة متحركة' : 'صورة'} من المكتبة</span>
        </button>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-outline btn-sm" onClick={onRequest}>
          <ImageIcon className="h-3.5 w-3.5" /> {selected ? 'تغيير' : 'اختيار'}
        </button>
        <div className="flex items-center gap-0.5 rounded-lg border border-ink-200 p-0.5 dark:border-ink-700">
          {(['right', 'center', 'left'] as const).map((a) => (
            <button
              key={a}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md text-ink-500',
                align === a && 'bg-gold-100 text-gold-700 dark:bg-gold-500/20 dark:text-gold-300',
              )}
              onClick={() => onUpdate({ metadata: { ...block.metadata, align: a } })}
              aria-label={a}
            >
              {a === 'right' ? <AlignRight className="h-3.5 w-3.5" /> : a === 'left' ? <AlignLeft className="h-3.5 w-3.5" /> : <AlignCenter className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
        <select
          className="input h-8 w-28 !py-0 text-xs"
          value={size}
          onChange={(e) => onUpdate({ metadata: { ...block.metadata, size: e.target.value as any } })}
        >
          <option value="small">صغير</option>
          <option value="medium">متوسط</option>
          <option value="large">كبير</option>
          <option value="full">كامل</option>
        </select>
      </div>
      <input
        className="input"
        value={block.metadata.caption ?? ''}
        onChange={(e) => onUpdate({ metadata: { ...block.metadata, caption: e.target.value } })}
        placeholder="تعليق على الصورة (اختياري)"
      />
    </div>
  )
}

function AudioBlock({
  block,
  selected,
  onUpdate,
  onRequest,
}: {
  block: BlockDraft
  selected?: AudioTrack
  onUpdate: (patch: Partial<BlockDraft>) => void
  onRequest: () => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-outline btn-sm" onClick={onRequest}>
          <Music className="h-3.5 w-3.5" /> {selected ? 'تغيير المقطع' : 'اختيار مقطع صوتي'}
        </button>
        {selected && (
          <span className="text-xs text-ink-400">
            {selected.name} · {selected.mime_type}
          </span>
        )}
      </div>
      <input
        className="input"
        value={block.metadata.audio_name ?? selected?.name ?? ''}
        onChange={(e) => onUpdate({ metadata: { ...block.metadata, audio_name: e.target.value } })}
        placeholder="اسم المقطع (مثال: الراوي، المطر، موسيقى التوتر)"
      />
      {selected && (
        <div className="rounded-xl border border-ink-100 p-2 dark:border-ink-800">
          <AudioPlayer src={selected.url} name={block.metadata.audio_name || selected.name} />
        </div>
      )}
    </div>
  )
}

function AddBlockBar({ onAdd }: { onAdd: (t: BlockType) => void }) {
  const [open, setOpen] = useState(false)
  const items: { type: BlockType; label: string; icon: React.ReactNode }[] = [
    { type: 'text', label: 'نص', icon: <Type className="h-4 w-4" /> },
    { type: 'heading', label: 'عنوان', icon: <Type className="h-4 w-4" /> },
    { type: 'quote', label: 'اقتباس', icon: <Quote className="h-4 w-4" /> },
    { type: 'image', label: 'صورة', icon: <ImageIcon className="h-4 w-4" /> },
    { type: 'gif', label: 'صورة متحركة', icon: <ImageIcon className="h-4 w-4" /> },
    { type: 'audio', label: 'صوت', icon: <Music className="h-4 w-4" /> },
    { type: 'divider', label: 'فاصل', icon: <Minus className="h-4 w-4" /> },
  ]
  return (
    <div className="relative">
      <button
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-300 py-3 text-sm font-medium text-ink-500 transition hover:border-gold-400 hover:text-gold-600 dark:border-ink-700 dark:text-ink-400"
        onClick={() => setOpen((v) => !v)}
      >
        <Plus className="h-4 w-4" /> إضافة عنصر
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-ink-100 bg-white p-2 shadow-card sm:grid-cols-4 dark:border-ink-800 dark:bg-ink-900">
          {items.map((it) => (
            <button
              key={it.type}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-ink-700 transition hover:bg-gold-50 hover:text-gold-700 dark:text-ink-200 dark:hover:bg-gold-500/10"
              onClick={() => {
                onAdd(it.type)
                setOpen(false)
              }}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
