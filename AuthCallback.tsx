import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/ui/Spinner'
import { LogoMark } from '../components/ui/Logo'

/**
 * صفحة العودة من Google OAuth.
 * supabase-js يتولى تبادل الرمز تلقائيًا (PKCE + detectSessionInUrl).
 * ننتظر ظهور الجلسة ثم نعيد التوجيه — دون صفحة بيضاء أو Redirect Loop.
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let done = false
    let attempts = 0

    const finish = () => {
      if (done) return
      done = true
      navigate('/', { replace: true })
    }

    // 1) جلسة موجودة مسبقًا؟
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish()
    })

    // 2) الاستماع لتغيّر الحالة
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) finish()
    })

    // 3) استقصاء احتياطي (حتى 10 ثوانٍ)
    const interval = setInterval(async () => {
      attempts++
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        clearInterval(interval)
        finish()
      } else if (attempts >= 20) {
        clearInterval(interval)
        const hash = window.location.hash || window.location.search
        if (hash.includes('error')) {
          setError('تعذّر إكمال تسجيل الدخول. حاول مرة أخرى.')
        } else {
          finish()
        }
      }
    }, 500)

    return () => {
      clearInterval(interval)
      sub.subscription.unsubscribe()
    }
  }, [navigate])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <LogoMark className="h-12 w-12" />
      {error ? (
        <>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button className="btn-primary" onClick={() => navigate('/login', { replace: true })}>
            العودة لتسجيل الدخول
          </button>
        </>
      ) : (
        <>
          <Spinner className="h-6 w-6 text-gold-500" />
          <p className="text-sm text-ink-500 dark:text-ink-400">جارٍ إكمال تسجيل الدخول…</p>
        </>
      )}
    </div>
  )
}
