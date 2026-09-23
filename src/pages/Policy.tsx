import { ShieldCheck, Ban, CheckCircle2 } from 'lucide-react'
import { SITE } from '../lib/constants'

const FORBIDDEN = [
  'الإباحية والمحتوى الجنسي الصريح.',
  'العري الصريح والوصف الجنسي الفاضح.',
  'المحتوى المصمم للإثارة الجنسية.',
  'الشتائم والبذاءة الفاحشة.',
  'التصنيفات والوسوم الإباحية.',
]

const ALLOWED = [
  'الرومانسية والحب والمشاعر.',
  'الدراما والحزن.',
  'الرعب والعنف القصصي غير الإباحي.',
  'المحتوى النفسي والمظلم.',
]

export default function Policy() {
  return (
    <div className="container-app max-w-3xl py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-100 text-gold-600 dark:bg-gold-500/15 dark:text-gold-400">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="font-display text-3xl font-bold text-ink-900 dark:text-parchment-100">
          سياسة المحتوى
        </h1>
        <p className="mt-2 text-ink-500 dark:text-ink-400">
          {SITE.nameAr} منصة مخصصة للمحتوى النظيف والمحترم.
        </p>
      </div>

      <div className="card p-6 sm:p-8">
        <section className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-red-600 dark:text-red-400">
            <Ban className="h-5 w-5" /> يُمنع نشر
          </h2>
          <ul className="space-y-2.5">
            {FORBIDDEN.map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-ink-700 dark:text-ink-200">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-sage-600 dark:text-sage-400">
            <CheckCircle2 className="h-5 w-5" /> يُسمح بـ
          </h2>
          <ul className="space-y-2.5">
            {ALLOWED.map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-ink-700 dark:text-ink-200">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage-500" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-xl bg-ink-50 p-4 text-sm leading-relaxed text-ink-600 dark:bg-ink-800/60 dark:text-ink-300">
            بشرط ألا يحتوي أي محتوى على مواد جنسية صريحة أو إباحية. تخضع جميع الأعمال لنظام إشراف
            يساعد الإدارة على مراجعة المحتوى قبل النشر وبعده.
          </p>
        </section>
      </div>
    </div>
  )
}
