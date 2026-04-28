'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

type Role = 'family' | 'caregiver' | 'specialist'

export default function SignupPage() {
  const t = useTranslations('auth.signup')
  const locale = useLocale()
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<Role | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const roles: { value: Role; label: string; desc: string; icon: string }[] = [
    { value: 'family', label: t('familyLabel'), desc: t('familyDesc'), icon: '👨‍👩‍👧' },
    { value: 'caregiver', label: t('caregiverLabel'), desc: t('caregiverDesc'), icon: '🤝' },
    { value: 'specialist', label: t('specialistLabel'), desc: t('specialistDesc'), icon: '📜' },
  ]

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!role) return
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(t('error'))
      setLoading(false)
      return
    }

    // 이미 가입된 이메일: Supabase가 오류 대신 identities: [] 로 응답
    if (data.user && data.user.identities?.length === 0) {
      setError('이미 사용 중인 이메일입니다. 해당 이메일로 로그인해주세요.')
      setLoading(false)
      return
    }

    router.push(`/${locale}/auth/login?message=email_sent`)
  }

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href={`/${locale}`} className="text-3xl font-extrabold text-emerald-700">
            Care<span className="text-amber-400">Link</span>
          </Link>
          <p className="text-gray-500 mt-2 text-sm">{t('subtitle')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${step >= s ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {s}
                </div>
                {s < 2 && <div className={`flex-1 h-0.5 w-8 ${step > s ? 'bg-emerald-700' : 'bg-gray-200'}`} />}
              </div>
            ))}
            <span className="text-xs text-gray-400 ml-2">
              {step === 1 ? t('roleSubtitle') : t('infoSubtitle')}
            </span>
          </div>

          {step === 1 && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">{t('roleTitle')}</h1>
              <p className="text-sm text-gray-500 mb-6">{t('roleSubtitle')}</p>

              <div className="space-y-3">
                {roles.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={`w-full text-left border rounded-xl px-4 py-4 transition
                      ${role === r.value
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100'
                        : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{r.icon}</span>
                      <div>
                        <div className="font-semibold text-sm text-gray-900">{r.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{r.desc}</div>
                      </div>
                      {role === r.value && (
                        <span className="ml-auto text-emerald-600 text-lg">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => role && setStep(2)}
                disabled={!role}
                className="w-full bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm
                  hover:bg-emerald-800 transition disabled:opacity-40 disabled:cursor-not-allowed mt-6">
                {t('next')}
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
                {t('back')}
              </button>
              <h1 className="text-xl font-bold text-gray-900 mb-1">{t('infoTitle')}</h1>
              <p className="text-sm text-gray-500 mb-6">{t('infoSubtitle')}</p>

              {error && (
                <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('name')}</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder={t('namePlaceholder')}
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                      focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                      focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('password')}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t('passwordHint')}
                    minLength={6}
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                      focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                  />
                </div>

                {/* 약관 동의 */}
                <label className="flex items-start gap-3 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-emerald-700 shrink-0"
                  />
                  <span className="text-xs text-gray-500 leading-relaxed">
                    <a href={`/${locale}/terms`} target="_blank" className="text-emerald-700 font-semibold hover:underline">이용약관</a>
                    {' '}및{' '}
                    <a href={`/${locale}/privacy`} target="_blank" className="text-emerald-700 font-semibold hover:underline">개인정보처리방침</a>
                    에 동의합니다. (필수)
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading || !agreedToTerms}
                  className="w-full bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm
                    hover:bg-emerald-800 transition disabled:opacity-40 disabled:cursor-not-allowed mt-2">
                  {loading ? t('loading') : t('submit')}
                </button>
              </form>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('hasAccount')}{' '}
            <Link href={`/${locale}/auth/login`} className="text-emerald-700 font-semibold hover:underline">
              {t('login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
