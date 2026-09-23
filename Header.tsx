import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Search,
  Menu,
  X,
  Sun,
  Moon,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  Shield,
  Heart,
  History,
  BookMarked,
  ChevronDown,
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import { Avatar } from '../ui/Avatar'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { cn } from '../../lib/utils'

const NAV = [
  { to: '/', label: 'الرئيسية', end: true },
  { to: '/browse', label: 'تصفّح الروايات' },
  { to: '/categories', label: 'التصنيفات' },
]

export function Header() {
  const { isAuthenticated, profile, isStaff, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/browse?q=${encodeURIComponent(q.trim())}`)
    setMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100/80 bg-parchment-50/85 backdrop-blur-lg dark:border-ink-800/80 dark:bg-ink-950/85">
      <div className="container-app flex h-16 items-center gap-3">
        <Link to="/" className="shrink-0" aria-label="روايات صمت">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-parchment-100'
                    : 'text-ink-600 hover:bg-ink-100/70 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800/60 dark:hover:text-parchment-100',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="relative ms-auto hidden max-w-xs flex-1 md:block">
          <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 start-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن رواية أو كاتب…"
            className="input !py-2 ps-9"
            aria-label="بحث"
          />
        </form>

        <div className="ms-auto flex items-center gap-1.5 md:ms-0">
          <button
            onClick={toggle}
            className="btn-ghost btn-sm !p-2"
            aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-full p-0.5 pe-1.5 transition hover:bg-ink-100 dark:hover:bg-ink-800"
                aria-label="القائمة"
              >
                <Avatar src={profile?.avatar_url} name={profile?.display_name} size={34} />
                <ChevronDown className="hidden h-4 w-4 text-ink-400 sm:block" />
              </button>
              {menuOpen && (
                <div className="absolute end-0 mt-2 w-56 overflow-hidden rounded-xl border border-ink-100 bg-white py-1.5 shadow-card animate-fade-in dark:border-ink-800 dark:bg-ink-900">
                  <div className="border-b border-ink-100 px-4 py-2.5 dark:border-ink-800">
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-parchment-100">
                      {profile?.display_name || 'قارئ'}
                    </p>
                    <p className="text-xs text-ink-400">
                      {profile?.role === 'owner' ? 'المالك' : profile?.role === 'staff' ? 'مشرف' : 'قارئ'}
                    </p>
                  </div>
                  <MenuItem to="/profile" icon={<UserIcon className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                    الملف الشخصي
                  </MenuItem>
                  <MenuItem to="/profile?tab=favorites" icon={<Heart className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                    المفضلة
                  </MenuItem>
                  <MenuItem to="/profile?tab=history" icon={<History className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                    سجل القراءة
                  </MenuItem>
                  <MenuItem to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                    لوحة الكاتب
                  </MenuItem>
                  {isStaff && (
                    <MenuItem to="/admin" icon={<Shield className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                      لوحة الإدارة
                    </MenuItem>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      signOut()
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <LogOut className="h-4 w-4" /> تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link to="/login" className="btn-ghost btn-sm">
                دخول
              </Link>
              <Link to="/register" className="btn-primary btn-sm">
                إنشاء حساب
              </Link>
            </div>
          )}

          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="btn-ghost btn-sm !p-2 lg:hidden"
            aria-label="القائمة"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-ink-100 bg-parchment-50 px-4 py-3 lg:hidden dark:border-ink-800 dark:bg-ink-950">
          <form onSubmit={submitSearch} className="relative mb-3 md:hidden">
            <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 start-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث…"
              className="input !py-2 ps-9"
            />
          </form>
          <nav className="flex flex-col gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive
                      ? 'bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-parchment-100'
                      : 'text-ink-600 dark:text-ink-300',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
            {!isAuthenticated && (
              <div className="mt-2 flex gap-2">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-outline flex-1">
                  دخول
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary flex-1">
                  إنشاء حساب
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

function MenuItem({
  to,
  icon,
  children,
  onClick,
}: {
  to: string
  icon: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-700 transition hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800"
    >
      {icon}
      {children}
    </Link>
  )
}
