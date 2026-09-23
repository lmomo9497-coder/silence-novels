import { useState } from 'react'
import { Database, KeyRound, Link2, ShieldCheck } from 'lucide-react'
import { LogoMark } from '../components/ui/Logo'
import { saveSupabaseConfig } from '../lib/supabase'
import { SITE } from '../lib/constants'

export default function Setup() {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^https?:\/\/.+/.test(url.trim())) {
      setError('رابط المشروع غير صالح. يجب أن يبدأ بـ https://')
      return
    }
    if (key.trim().length < 20) {
      setError('مفتاح anon غير صالح.')
      return
    }
    saveSupabaseConfig(url, key)
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment-100 px-4 py-10 dark:bg-ink-950">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="h-14 w-14" />
          <h1 className="mt-3 font-display text-2xl font-bold text-ink-900 dark:text-parchment-100">
            {SITE.nameAr}
          </h1>
          <p className="text-xs tracking-[0.25em] text-gold-600 dark:text-gold-400">
            {SITE.nameEn.toUpperCase()}
          </p>
        </div>

        <div className="card p-6">
          <div className="mb-5 flex items-start gap-3 rounded-xl bg-gold-50 p-3.5 text-sm text-gold-800 dark:bg-gold-500/10 dark:text-gold-300">
            <Database className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="leading-relaxed">
              اربط المنصة بمشروع <strong>Supabase</strong> الخاص بك. أنشئ مشروعًا جديدًا، ثم نفّذ ملفات
              الترحيل من مجلد <code className="rounded bg-black/10 px-1">supabase/migrations</code>،
              وأدخل بيانات الاتصال هنا.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">
                <Link2 className="me-1 inline h-4 w-4" /> Project URL
              </label>
              <input
                className="input"
                dir="ltr"
                placeholder="https://xxxxxxxx.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="label">
                <KeyRound className="me-1 inline h-4 w-4" /> Anon public key
              </label>
              <input
                className="input"
                dir="ltr"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6…"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full">
              <ShieldCheck className="h-4 w-4" /> حفظ ومتابعة
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-ink-400">
            يُحفظ الإعداد محليًا في متصفحك فقط. لا تُخزَّن أي مفاتيح سرية في الكود.
          </p>
        </div>
      </div>
    </div>
  )
}
