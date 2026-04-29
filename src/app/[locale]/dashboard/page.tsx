'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import NotificationBell from '@/components/layout/NotificationBell'

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showVerifiedBanner, setShowVerifiedBanner] = useState(false)

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setShowVerifiedBanner(true)
      setTimeout(() => setShowVerifiedBanner(false), 6000)
    }
  }, [searchParams])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push(`/${locale}/auth/login`); return }

      const { data } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

      setProfile(data)
      setIsAdmin(user.email === 'wldwm83@gmail.com')
      setLoading(false)
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push(`/${locale}`)
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    const res = await fetch('/api/delete-account', { method: 'DELETE' })
    if (res.ok) {
      await supabase.auth.signOut()
      router.push(`/${locale}`)
    } else {
      setDeleting(false)
      setShowDeleteModal(false)
      alert('탈퇴 처리 중 오류가 발생했습니다.')
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const roleLabel = profile?.role === 'caregiver' ? t('roleCaregiver')
    : profile?.role === 'specialist' ? t('roleSpecialist') : t('roleFamily')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}`} className="text-xl font-extrabold text-emerald-700">
            Care<span className="text-amber-400">Link</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700">
              {t('logout')}
            </button>
          </div>
        </div>
      </header>

      {showVerifiedBanner && (
        <div className="bg-emerald-600 text-white text-center text-sm font-medium py-3 px-4">
          ✅ 이메일 인증이 완료됐습니다! CareLink에 오신 걸 환영해요.
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-emerald-700 text-white rounded-2xl p-8 mb-8">
          <p className="text-emerald-200 text-sm font-medium mb-1">{roleLabel}</p>
          <h1 className="text-2xl font-extrabold">
            {t('welcome')} {profile?.full_name || ''}
            {t('welcomeSuffix')}
          </h1>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {profile?.role === 'family' && (
            <>
              <Link href={`/${locale}/search`}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition hover:-translate-y-0.5">
                <div className="text-3xl mb-3">🔍</div>
                <h3 className="font-bold text-gray-900 mb-1">{t('findCaregiver')}</h3>
                <p className="text-sm text-gray-500">{t('findCaregiverDesc')}</p>
              </Link>
              <Link href={`/${locale}/favorites`}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition hover:-translate-y-0.5">
                <div className="text-3xl mb-3">♥</div>
                <h3 className="font-bold text-gray-900 mb-1">{t('favorites')}</h3>
                <p className="text-sm text-gray-500">{t('favoritesDesc')}</p>
              </Link>
              <Link href={`/${locale}/consultations`}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition hover:-translate-y-0.5">
                <div className="text-3xl mb-3">📋</div>
                <h3 className="font-bold text-gray-900 mb-1">{t('myConsultations')}</h3>
                <p className="text-sm text-gray-500">{t('myConsultationsDesc')}</p>
              </Link>
              <div className="bg-white border border-gray-200 rounded-2xl p-6 opacity-60">
                <div className="text-3xl mb-3">📜</div>
                <h3 className="font-bold text-gray-900 mb-1">{t('findSpecialist')}</h3>
                <p className="text-sm text-gray-500">{t('comingSoon')}</p>
              </div>
            </>
          )}

          {profile?.role === 'caregiver' && (
            <>
              <Link href={`/${locale}/caregivers/profile`}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition hover:-translate-y-0.5">
                <div className="text-3xl mb-3">👤</div>
                <h3 className="font-bold text-gray-900 mb-1">{t('myProfile')}</h3>
                <p className="text-sm text-gray-500">{t('myProfileDesc')}</p>
              </Link>
              <Link href={`/${locale}/consultations`}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition hover:-translate-y-0.5">
                <div className="text-3xl mb-3">📅</div>
                <h3 className="font-bold text-gray-900 mb-1">{t('incomingRequests')}</h3>
                <p className="text-sm text-gray-500">{t('incomingRequestsDesc')}</p>
              </Link>
            </>
          )}

          {profile?.role === 'specialist' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 opacity-60">
              <div className="text-3xl mb-3">📋</div>
              <h3 className="font-bold text-gray-900 mb-1">{t('findSpecialist')}</h3>
              <p className="text-sm text-gray-500">{t('comingSoon')}</p>
            </div>
          )}
        </div>

        {isAdmin && (
          <Link
            href={`/${locale}/admin`}
            className="mt-8 flex items-center justify-between bg-red-50 border border-red-100
              rounded-2xl p-5 hover:bg-red-100 transition group">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚙️</span>
              <div>
                <p className="font-bold text-gray-900 text-sm">관리자 페이지</p>
                <p className="text-xs text-gray-500">사용자·프로필·리뷰·상담 관리</p>
              </div>
            </div>
            <span className="text-gray-400 group-hover:text-gray-600 text-lg">→</span>
          </Link>
        )}

        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-xs text-gray-400 hover:text-red-500 transition underline underline-offset-2">
            회원 탈퇴
          </button>
        </div>
      </main>

      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={() => !deleting && setShowDeleteModal(false)}>
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-4 text-center">⚠️</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">정말 탈퇴하시겠습니까?</h3>
            <p className="text-sm text-gray-500 text-center leading-relaxed mb-6">
              계정과 모든 데이터가 영구적으로 삭제됩니다.<br />이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl text-sm
                  font-semibold hover:bg-gray-50 transition disabled:opacity-50">
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl text-sm font-semibold
                  hover:bg-red-600 transition disabled:opacity-50">
                {deleting ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
