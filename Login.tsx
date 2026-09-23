import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, LogIn } from 'lucide-react'
import { LogoMark } from '../components/ui/Logo'
import { Spinner } from '../components/ui/Spinner'
import { GoogleButton } from '../components/auth/GoogleButton'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'

export default function Login() {
  const { signIn } = useAuth()
  const { success, error: toastError } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email.trim(), password)
    setLoading(false)
    if (err) {
      setError(translateAuthError(err))
      return
    }
    success('تم تسجيل الدخول بنجاح')
    navigate(from, { replace: true })
  }

  return (
    <div className="container-app flex min-h-[80vh] items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="h-12 w-12" />
          <h1 className="mt-3 font-display text-2xl font-bold text-ink-900 dark:text-parchment-100">
            تسجيل الدخول
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            مرحبًا بعودتك إلى روايات صمت
          </p>
        </div>

        <div className="card p-6">
          <GoogleButton label="الدخول عبر Google" />

          <div className="my-5 flex items-center gap-3 text-xs text-ink-400">
            <span className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
            أو بالبريد الإلكتروني
            <span className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">
                <Mail className="me-1 inline h-4 w-4" /> البريد الإلكتروني
              </label>
              <input
                type="email"
                required
                dir="ltr"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label">
                <Lock className="me-1 inline h-4 w-4" /> كلمة المرور
              </label>
              <input
                type="password"
                required
                dir="ltr"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              تسجيل الدخول
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-500 dark:text-ink-400">
            ليس لديك حساب؟{' '}
            <Link to="/register" className="font-medium text-gold-600 hover:underline dark:text-gold-400">
              أنشئ حسابًا
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export function translateAuthError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
  if (m.includes('email not confirmed')) return 'يرجى تأكيد بريدك الإلكتروني أولًا.'
  if (m.includes('already registered')) return 'هذا البريد مسجّل مسبقًا.'
  if (m.includes('password should be')) return 'كلمة المرور قصيرة جدًا (6 أحرف على الأقل).'
  if (m.includes('rate limit')) return 'محاولات كثيرة. حاول لاحقًا.'
  return msg
}
