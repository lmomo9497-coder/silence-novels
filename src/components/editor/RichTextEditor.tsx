import { useEffect, useState } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Minus,
  Palette,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react'
import { FontFamily, FontSize } from './extensions'
import { cn } from '../../lib/utils'
import type { Character } from '../../lib/types'

const FONT_SIZES = ['14px', '16px', '18px', '20px', '22px', '24px', '28px', '32px']
const FONT_FAMILIES = [
  { label: 'أميري', value: "'Amiri', serif" },
  { label: 'نوتو نسخ', value: "'Noto Naskh Arabic', serif" },
  { label: 'IBM بلكس', value: "'IBM Plex Sans Arabic', sans-serif" },
  { label: 'ريم كوفي', value: "'Reem Kufi', sans-serif" },
  { label: 'سيريف', value: 'Georgia, serif' },
]
const TEXT_COLORS = [
  '#1f2937', '#b91c1c', '#c2410c', '#a16207', '#15803d',
  '#0f766e', '#1d4ed8', '#7e22ce', '#be185d', '#c8912f',
  '#4f7f60', '#8a6fb0', '#b06f6f', '#5b7fb0', '#6b7280',
]

export function RichTextEditor({
  value,
  onChange,
  characters = [],
  placeholder = 'اكتب هنا…',
  minHeight = '12rem',
}: {
  value: string
  onChange: (html: string) => void
  characters?: Character[]
  placeholder?: string
  minHeight?: string
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      FontFamily,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'tiptap block-content focus:outline-none',
        dir: 'auto',
      },
    },
  })

  // مزامنة القيمة عند التغيير الخارجي (مثل تبديل الفصل)
  useEffect(() => {
    if (!editor) return
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  if (!editor) return null

  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900">
      <Toolbar editor={editor} characters={characters} />
      <div className="px-4 py-3" style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function Toolbar({ editor, characters }: { editor: Editor; characters: Character[] }) {
  const [showColors, setShowColors] = useState(false)
  const [showChars, setShowChars] = useState(false)

  const btn = (active: boolean) =>
    cn(
      'flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 transition hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800',
      active && 'bg-gold-100 text-gold-700 dark:bg-gold-500/20 dark:text-gold-300',
    )

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-ink-100 bg-ink-50/60 p-2 dark:border-ink-800 dark:bg-ink-800/40">
      <button className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} title="عريض">
        <Bold className="h-4 w-4" />
      </button>
      <button className={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} title="مائل">
        <Italic className="h-4 w-4" />
      </button>
      <button className={btn(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="تسطير">
        <UnderlineIcon className="h-4 w-4" />
      </button>
      <button className={btn(editor.isActive('strike'))} onClick={() => editor.chain().focus().toggleStrike().run()} title="يتوسطه خط">
        <Strikethrough className="h-4 w-4" />
      </button>

      <span className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-700" />

      {/* العناوين */}
      <select
        className="h-8 rounded-lg border border-ink-200 bg-white px-1.5 text-xs dark:border-ink-700 dark:bg-ink-900"
        value={
          editor.isActive('heading', { level: 1 })
            ? 'h1'
            : editor.isActive('heading', { level: 2 })
              ? 'h2'
              : editor.isActive('heading', { level: 3 })
                ? 'h3'
                : 'p'
        }
        onChange={(e) => {
          const v = e.target.value
          if (v === 'p') editor.chain().focus().setParagraph().run()
          else editor.chain().focus().toggleHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run()
        }}
        title="نمط الفقرة"
      >
        <option value="p">فقرة</option>
        <option value="h1">عنوان 1</option>
        <option value="h2">عنوان 2</option>
        <option value="h3">عنوان 3</option>
      </select>

      {/* حجم الخط */}
      <select
        className="h-8 rounded-lg border border-ink-200 bg-white px-1.5 text-xs dark:border-ink-700 dark:bg-ink-900"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) editor.chain().focus().setFontSize(e.target.value).run()
          else editor.chain().focus().unsetFontSize().run()
        }}
        title="حجم الخط"
      >
        <option value="">الحجم</option>
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>
            {s.replace('px', '')}
          </option>
        ))}
      </select>

      {/* نوع الخط */}
      <select
        className="h-8 max-w-[7rem] rounded-lg border border-ink-200 bg-white px-1.5 text-xs dark:border-ink-700 dark:bg-ink-900"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) editor.chain().focus().setFontFamily(e.target.value).run()
          else editor.chain().focus().unsetFontFamily().run()
        }}
        title="نوع الخط"
      >
        <option value="">الخط</option>
        {FONT_FAMILIES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <span className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-700" />

      {/* المحاذاة */}
      <button className={btn(editor.isActive({ textAlign: 'right' }))} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="يمين">
        <AlignRight className="h-4 w-4" />
      </button>
      <button className={btn(editor.isActive({ textAlign: 'center' }))} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="وسط">
        <AlignCenter className="h-4 w-4" />
      </button>
      <button className={btn(editor.isActive({ textAlign: 'left' }))} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="يسار">
        <AlignLeft className="h-4 w-4" />
      </button>

      <span className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-700" />

      <button className={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="قائمة نقطية">
        <List className="h-4 w-4" />
      </button>
      <button className={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="قائمة مرقّمة">
        <ListOrdered className="h-4 w-4" />
      </button>
      <button className={btn(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="اقتباس">
        <Quote className="h-4 w-4" />
      </button>
      <button className={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="فاصل">
        <Minus className="h-4 w-4" />
      </button>

      <span className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-700" />

      {/* الألوان */}
      <div className="relative">
        <button className={btn(showColors)} onClick={() => { setShowColors((v) => !v); setShowChars(false) }} title="لون النص">
          <Palette className="h-4 w-4" />
        </button>
        {showColors && (
          <div className="absolute z-20 mt-1 grid w-44 grid-cols-5 gap-1.5 rounded-xl border border-ink-200 bg-white p-2 shadow-card dark:border-ink-700 dark:bg-ink-900">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                className="h-6 w-6 rounded-md ring-1 ring-ink-900/10"
                style={{ background: c }}
                onClick={() => {
                  editor.chain().focus().setColor(c).run()
                  setShowColors(false)
                }}
                aria-label={`لون ${c}`}
              />
            ))}
            <button
              className="col-span-5 mt-1 rounded-md border border-ink-200 py-1 text-[11px] dark:border-ink-700"
              onClick={() => {
                editor.chain().focus().unsetColor().run()
                setShowColors(false)
              }}
            >
              إزالة اللون
            </button>
          </div>
        )}
      </div>

      {/* ألوان الشخصيات */}
      {characters.length > 0 && (
        <div className="relative">
          <button className={btn(showChars)} onClick={() => { setShowChars((v) => !v); setShowColors(false) }} title="لون شخصية">
            <span className="text-xs font-bold">أب</span>
          </button>
          {showChars && (
            <div className="absolute z-20 mt-1 w-52 rounded-xl border border-ink-200 bg-white p-2 shadow-card dark:border-ink-700 dark:bg-ink-900">
              <p className="mb-1.5 px-1 text-[11px] text-ink-400">تلوين اسم شخصية</p>
              <div className="max-h-52 space-y-1 overflow-y-auto">
                {characters.map((ch) => (
                  <button
                    key={ch.id}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-ink-100 dark:hover:bg-ink-800"
                    onClick={() => {
                      editor.chain().focus().setColor(ch.color).run()
                      setShowChars(false)
                    }}
                  >
                    <span className="h-3.5 w-3.5 rounded-full" style={{ background: ch.color }} />
                    <span style={{ color: ch.color }}>{ch.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <span className="mx-1 h-5 w-px bg-ink-200 dark:bg-ink-700" />

      <button className={btn(false)} onClick={() => editor.chain().focus().undo().run()} title="تراجع">
        <Undo2 className="h-4 w-4" />
      </button>
      <button className={btn(false)} onClick={() => editor.chain().focus().redo().run()} title="إعادة">
        <Redo2 className="h-4 w-4" />
      </button>
    </div>
  )
}
