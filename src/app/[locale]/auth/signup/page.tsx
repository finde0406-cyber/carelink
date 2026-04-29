'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

type Role = 'family' | 'caregiver' | 'specialist'

const ROLES: { value: Role; icon: string; label: string; desc: string; color: string }[] = [
  { value: 'family',    icon: '🏠', label: '가족·보호자',   desc: '돌봄이 필요한 가족을 위해 요양보호사를 찾고 있어요', color: 'emerald' },
  { value: 'caregiver', icon: '🤝', label: '요양보호사',    desc: '전문 자격증을 가진 요양보호사로 일하고 있어요',       color: 'blue'    },
  { value: 'specialist',icon: '📋', label: '법률·세무 전문가', desc: '법률, 세무, 상속 관련 전문 서비스를 제공해요',     color: 'purple'  },
]

export default function SignupPage() {
  const t = useTranslations('auth.signup')
  const locale = useLocale()
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]           = useState<1 | 2>(1)
  const [dir,  setDir]            = useState<'fwd' | 'bwd'>('fwd')
  const [role, setRole]           = useState<Role | null>(null)
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [agreed, setAgreed]       = useState(false)

  function selectRole(r: Role) {
    setRole(r)
    setTimeout(() => { setDir('fwd'); setStep(2) }, 260)
  }

  function goBack() {
    setDir('bwd')
    setStep(1)
  }

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

    if (error) { setError(t('error')); setLoading(false); return }
    if (data.user && data.user.identities?.length === 0) {
      setError('이미 사용 중인 이메일입니다. 해당 이메일로 로그인해주세요.')
      setLoading(false)
      return
    }
    router.push(`/${locale}/auth/login?message=email_sent`)
  }

  const selectedRole = ROLES.find(r => r.value === role)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50
      flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href={`/${locale}`} className="inline-block">
            <span className="text-3xl font-extrabold text-emerald-700">
              Care<span className="text-amber-400">Link</span>
            </span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/60 border border-gray-100 overflow-hidden">

          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div className="h-full bg-emerald-500 transition-all duration-500 ease-out"
              style={{ width: step === 1 ? '35%' : '100%' }} />
          </div>

          <div className="p-8">

            {/* Step 1 — Role selection */}
            {step === 1 && (
              <div key="s1" className={dir === 'fwd' ? 'step-fwd' : 'step-bwd'}>
                <p className="text-xs font-bold text-emerald-600 tracking-wide uppercase mb-1">
                  1 / 2 단계
                </p>
                <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
                  어떻게 오셨나요?
                </h1>
                <p className="text-sm text-gray-500 mb-6">해당되는 항목을 선택해 주세요</p>

                <div className="space-y-3">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      onClick={() => selectRole(r.value)}
                      className={`w-full text-left border-2 rounded-2xl px-5 py-4 transition-all duration-200
                        active:scale-[0.98]
                        ${role === r.value
                          ? 'border-emerald-500 bg-emerald-50 shadow-sm shadow-emerald-100'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{r.icon}</span>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-sm">{r.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{r.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                          ${role === r.value
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-gray-300'
                          }`}>
                          {role === r.value && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8"
                                strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-center text-sm text-gray-400 mt-6">
                  이미 계정이 있으신가요?{' '}
                  <Link href={`/${locale}/auth/login`} className="text-emerald-600 font-semibold hover:underline">
                    로그인
                  </Link>
                </p>
              </div>
            )}

            {/* Step 2 — Info */}
            {step === 2 && (
              <div key="s2" className={dir === 'fwd' ? 'step-fwd' : 'step-bwd'}>
                <button onClick={goBack}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-5 transition">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  이전
                </button>

                {selectedRole && (
                  <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 mb-5">
                    <span className="text-xl">{selectedRole.icon}</span>
                    <div>
                      <p className="text-xs text-gray-500">선택한 유형</p>
                      <p className="font-bold text-gray-900 text-sm">{selectedRole.label}</p>
                    </div>
                  </div>
                )}

                <p className="text-xs font-bold text-emerald-600 tracking-wide uppercase mb-1">
                  2 / 2 단계
                </p>
                <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
                  기본 정보를 입력해 주세요
                </h1>
                <p className="text-sm text-gray-500 mb-6">가입 후 언제든 수정할 수 있어요</p>

                {error && (
                  <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm mb-4 fade-up">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      이름 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="홍길동"
                      required
                      autoFocus
                      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none
                        focus:border-emerald-500 bg-gray-50 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      이메일 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      required
                      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none
                        focus:border-emerald-500 bg-gray-50 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      비밀번호 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="6자리 이상"
                      minLength={6}
                      required
                      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none
                        focus:border-emerald-500 bg-gray-50 focus:bg-white transition"
                    />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer pt-1">
                    <button
                      type="button"
                      onClick={() => setAgreed(v => !v)}
                      className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                        ${agreed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-emerald-400'}`}>
                      {agreed && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                    <span className="text-xs text-gray-500 leading-relaxed">
                      <a href={`/${locale}/terms`} target="_blank"
                        className="text-emerald-600 font-semibold hover:underline">이용약관</a>
                      {' '}및{' '}
                      <a href={`/${locale}/privacy`} target="_blank"
                        className="text-emerald-600 font-semibold hover:underline">개인정보처리방침</a>
                      에 동의합니다 <span className="text-red-400">(필수)</span>
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading || !agreed}
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base
                      hover:bg-emerald-700 active:scale-[0.98] transition disabled:opacity-40
                      disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
                    {loading
                      ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 처리 중...</>
                      : '가입 완료하기'
                    }
                  </button>
                </form>

                <p className="text-center text-sm text-gray-400 mt-5">
                  이미 계정이 있으신가요?{' '}
                  <Link href={`/${locale}/auth/login`}
                    className="text-emerald-600 font-semibold hover:underline">
                    로그인
                  </Link>
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
