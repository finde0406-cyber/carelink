'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Role = 'family' | 'caregiver' | 'specialist'

const roles: { value: Role; label: string; desc: string; icon: string }[] = [
  { value: 'family', label: '가족/보호자', desc: '요양보호사 또는 전문가를 찾고 있어요', icon: '👨‍👩‍👧' },
  { value: 'caregiver', label: '요양보호사', desc: '돌봄 서비스를 제공하고 싶어요', icon: '🤝' },
  { value: 'specialist', label: '전문가', desc: '상속·법률·세무 전문가예요', icon: '📜' },
]

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<Role | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!role) return
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.')
      setLoading(false)
      return
    }

    router.push('/auth/login?verified=1')
  }

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-extrabold text-emerald-700">
            Care<span className="text-amber-400">Link</span>
          </Link>
          <p className="text-gray-500 mt-2 text-sm">무료로 시작하세요</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* Step indicator */}
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
              {step === 1 ? '역할 선택' : '계정 정보'}
            </span>
          </div>

          {/* Step 1: 역할 선택 */}
          {step === 1 && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">어떤 분이세요?</h1>
              <p className="text-sm text-gray-500 mb-6">역할을 선택해주세요</p>

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
                다음
              </button>
            </div>
          )}

          {/* Step 2: 계정 정보 */}
          {step === 2 && (
            <div>
              <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
                ← 뒤로
              </button>
              <h1 className="text-xl font-bold text-gray-900 mb-1">계정 만들기</h1>
              <p className="text-sm text-gray-500 mb-6">정보를 입력해주세요</p>

              {error && (
                <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">이름</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="홍길동"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                      focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="6자 이상"
                    minLength={6}
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                      focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm
                    hover:bg-emerald-800 transition disabled:opacity-60 disabled:cursor-not-allowed mt-2">
                  {loading ? '가입 중...' : '회원가입'}
                </button>
              </form>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            이미 계정이 있으신가요?{' '}
            <Link href="/auth/login" className="text-emerald-700 font-semibold hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
