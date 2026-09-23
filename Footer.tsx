import { Link } from 'react-router-dom'
import { LogoMark } from '../ui/Logo'
import { SITE } from '../../lib/constants'

export function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-100 bg-parchment-50 dark:border-ink-800 dark:bg-ink-950">
      <div className="container-app grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <div>
              <p className="font-display text-base font-bold text-ink-900 dark:text-parchment-100">
                {SITE.nameAr}
              </p>
              <p className="text-[10px] tracking-[0.2em] text-gold-600 dark:text-gold-400">
                {SITE.nameEn.toUpperCase()}
              </p>
            </div>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-500 dark:text-ink-400">
            {SITE.description}
          </p>
        </div>

        <div>
          <h4 className="mb-3 font-display text-sm font-semibold text-ink-900 dark:text-parchment-100">
            الاستكشاف
          </h4>
          <ul className="space-y-2 text-sm text-ink-500 dark:text-ink-400">
            <li><Link to="/browse" className="hover:text-gold-600 dark:hover:text-gold-400">جميع الروايات</Link></li>
            <li><Link to="/browse?sort=views" className="hover:text-gold-600 dark:hover:text-gold-400">الأكثر قراءة</Link></li>
            <li><Link to="/browse?status=completed" className="hover:text-gold-600 dark:hover:text-gold-400">الروايات المكتملة</Link></li>
            <li><Link to="/categories" className="hover:text-gold-600 dark:hover:text-gold-400">التصنيفات</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-display text-sm font-semibold text-ink-900 dark:text-parchment-100">
            للكتّاب
          </h4>
          <ul className="space-y-2 text-sm text-ink-500 dark:text-ink-400">
            <li><Link to="/dashboard" className="hover:text-gold-600 dark:hover:text-gold-400">لوحة الكاتب</Link></li>
            <li><Link to="/dashboard/novels/new" className="hover:text-gold-600 dark:hover:text-gold-400">انشر روايتك</Link></li>
            <li><Link to="/policy" className="hover:text-gold-600 dark:hover:text-gold-400">سياسة المحتوى</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-display text-sm font-semibold text-ink-900 dark:text-parchment-100">
            الحساب
          </h4>
          <ul className="space-y-2 text-sm text-ink-500 dark:text-ink-400">
            <li><Link to="/login" className="hover:text-gold-600 dark:hover:text-gold-400">تسجيل الدخول</Link></li>
            <li><Link to="/register" className="hover:text-gold-600 dark:hover:text-gold-400">إنشاء حساب</Link></li>
            <li><Link to="/profile" className="hover:text-gold-600 dark:hover:text-gold-400">الملف الشخصي</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100 py-5 dark:border-ink-800">
        <p className="container-app text-center text-xs text-ink-400">
          © {new Date().getFullYear()} {SITE.nameAr} — {SITE.nameEn}. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  )
}
