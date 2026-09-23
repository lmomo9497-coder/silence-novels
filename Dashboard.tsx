import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Eye,
  FileText,
  Image as ImageIcon,
  Layers,
  Music,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  Users,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { CoverImage } from '../../components/novel/CoverImage'
import { cn, formatNumber, timeAgo } from '../../lib/utils'
import { statusLabel } from '../../lib/constants'
import type { Novel } from '../../lib/types'

export default function Dashboard() {
  const { user, profile, isStaff } = useAuth()
  const { success, error } = useToast()
  const [novels, setNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)
  const [toDelete, setToDelete] = useState<Novel | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    let query = supabase
      .from('novels')
      .select(
        '*, category:categories(*), chapters:chapters(id, chapter_number, title, slug, is_published, published_at, updated_at, views)',
      )
      .order('updated_at', { ascending: false })
    // المالك/المشرف يرى كل الروايات، الكاتب يرى رواياته فقط
    if (!isStaff) query = query.eq('author_id', user.id)
    const { data, error: e } = await query
    if (e) {
      error('تعذّر تحميل الروايات')
      setLoading(false)
      return
    }
    setNovels(
      (data ?? []).map((n: any) => ({
        ...n,
        chapters: (n.chapters ?? []).slice().sort((a: any, b: any) => a.chapter_number - b.chapter_number),
      })),
    )
    setLoading(false)
  }, [user, isStaff, error])

  useEffect(() => {
    load()
  }, [load])

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    const { error: e } = await supabase.from('novels').delete().eq('id', toDelete.id)
    setDeleting(false)
    if (e) {
      error('تعذّر حذف الرواية')
      return
    }
    success('تم حذف الرواية')
    setToDelete(null)
    load()
  }

  const totals = novels.reduce(
    (acc, n) => {
      acc.chapters += n.chapters?.length ?? 0
      acc.views += Number(n.views || 0)
      return acc
    },
    { chapters: 0, views: 0 },
  )

  return (
    <div className="container-app py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-parchment-100">
            لوحة الكاتب
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            مرحبًا {profile?.display_name || 'كاتب'} — أنشئ رواياتك وأدر فصولها.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isStaff && (
            <Link to="/admin" className="btn-outline">
              <Settings2 className="h-4 w-4" /> لوحة الإدارة
            </Link>
          )}
          <Link to="/dashboard/novels/new" className="btn-gold">
            <Plus className="h-4 w-4" /> رواية جديدة
          </Link>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<BookOpen className="h-5 w-5" />} label="الروايات" value={formatNumber(novels.length)} />
        <StatCard icon={<Layers className="h-5 w-5" />} label="الفصول" value={formatNumber(totals.chapters)} />
        <StatCard icon={<Eye className="h-5 w-5" />} label="القراءات" value={formatNumber(totals.views)} />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="المنشورة"
          value={formatNumber(novels.filter((n) => n.is_published).length)}
        />
      </div>

      {loading ? (
        <PageLoader />
      ) : !novels.length ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="لا توجد روايات بعد"
          description="ابدأ بإنشاء روايتك الأولى، أضف الغلاف والوصف ثم ابدأ بكتابة الفصول."
          action={
            <Link to="/dashboard/novels/new" className="btn-gold">
              <Plus className="h-4 w-4" /> إنشاء رواية
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {novels.map((n) => (
            <div key={n.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="w-20 shrink-0">
                <CoverImage src={n.cover_url} title={n.title} rounded="rounded-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-parchment-100">
                    {n.title}
                  </h3>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      n.is_published
                        ? 'bg-sage-100 text-sage-700 dark:bg-sage-500/20 dark:text-sage-300'
                        : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400',
                    )}
                  >
                    {n.is_published ? 'منشورة' : 'مسودة'}
                  </span>
                  <span className="chip !px-2 !py-0.5 !text-[10px]">{statusLabel(n.status)}</span>
                  {n.is_flagged && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-300">
                      مُبلّغ عنها
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                  {n.author_name} · {n.category?.name_ar || 'بدون تصنيف'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
                  <span className="inline-flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" /> {formatNumber(n.chapters?.length ?? 0)} فصل
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" /> {formatNumber(n.views)}
                  </span>
                  <span>آخر تحديث {timeAgo(n.updated_at)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-col">
                <Link to={`/dashboard/novels/${n.id}`} className="btn-outline btn-sm">
                  <Pencil className="h-3.5 w-3.5" /> تعديل
                </Link>
                <Link to={`/dashboard/novels/${n.id}/characters`} className="btn-outline btn-sm">
                  <Users className="h-3.5 w-3.5" /> الشخصيات
                </Link>
                <Link to={`/dashboard/novels/${n.id}/media`} className="btn-outline btn-sm">
                  <ImageIcon className="h-3.5 w-3.5" /> الوسائط
                </Link>
                <button className="btn-ghost btn-sm text-red-600" onClick={() => setToDelete(n)}>
                  <Trash2 className="h-3.5 w-3.5" /> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        danger
        title="حذف الرواية"
        message={`سيتم حذف «${toDelete?.title}» وكل فصولها ووسائطها نهائيًا. لا يمكن التراجع.`}
        confirmLabel="حذف نهائي"
      />
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-100 text-gold-600 dark:bg-gold-500/15 dark:text-gold-400">
        {icon}
      </span>
      <div>
        <p className="text-xs text-ink-500 dark:text-ink-400">{label}</p>
        <p className="font-display text-xl font-bold text-ink-900 dark:text-parchment-100">{value}</p>
      </div>
    </div>
  )
}
