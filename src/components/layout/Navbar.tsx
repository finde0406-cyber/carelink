'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import LanguageSwitcher from './LanguageSwitcher'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  const ADMIN_EMAIL = 'wldwm83@gmail.com'

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
      setIsAdmin(user?.email === ADMIN_EMAIL)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
      setIsAdmin(session?.user?.email === ADMIN_EMAIL)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setLogoutConfirm(false)
    setMenuOpen(false)
    router.push(`/${locale}`)
  }

  return (
    <>
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={`/${locale}`} className="text-2xl font-extrabold tracking-tight text-emerald-700">
          Care<span className="text-amber-400">Link</span>
        </Link>

        {/* 데스크탑 */}
        <div className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-600">
          <Link href={`/${locale}/search`} className="hover:text-emerald-700 transition">{t('findCaregivers')}</Link>
          <Link href={`/${locale}/partners`} className="hover:text-emerald-700 transition">{t('forCaregivers')}</Link>
          <LanguageSwitcher />
          {isLoggedIn ? (
            <>
              {isAdmin && (
                <Link href={`/${locale}/admin`}
                  className="flex items-center gap-1.5 text-xs font-bold bg-red-500 text-white px-3 py-1.5 rounded-full hover:bg-red-600 transition">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  관리자
                </Link>
              )}
              <Link href={`/${locale}/dashboard`}
                className="bg-emerald-700 text-white px-5 py-2 rounded-full hover:bg-emerald-800 transition">
                대시보드
              </Link>
              <button onClick={() => setLogoutConfirm(true)}
                className="hover:text-emerald-700 transition">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href={`/${locale}/auth/login`} className="hover:text-emerald-700 transition">{t('signIn')}</Link>
              <Link href={`/${locale}/auth/signup`}
                className="bg-emerald-700 text-white px-5 py-2 rounded-full hover:bg-emerald-800 transition">
                {t('getStarted')}
              </Link>
            </>
          )}
        </div>

        {/* 모바일 햄버거 */}
        <div className="md:hidden flex items-center gap-3">
          <LanguageSwitcher />
          <button className="p-2" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="w-5 h-0.5 bg-gray-700 mb-1" />
            <div className="w-5 h-0.5 bg-gray-700 mb-1" />
            <div className="w-5 h-0.5 bg-gray-700" />
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4 text-sm font-medium text-gray-700">
          <Link href={`/${locale}/search`} onClick={() => setMenuOpen(false)}>{t('findCaregivers')}</Link>
          <Link href={`/${locale}/partners`} onClick={() => setMenuOpen(false)}>{t('forCaregivers')}</Link>
          {isLoggedIn ? (
            <>
              {isAdmin && (
                <Link href={`/${locale}/admin`}
                  className="flex items-center gap-2 bg-red-500 text-white text-center px-5 py-2 rounded-full"
                  onClick={() => setMenuOpen(false)}>
                  🛡️ 관리자 페이지
                </Link>
              )}
              <Link href={`/${locale}/dashboard`}
                className="bg-emerald-700 text-white text-center px-5 py-2 rounded-full"
                onClick={() => setMenuOpen(false)}>
                대시보드
              </Link>
              <button onClick={() => { setMenuOpen(false); setLogoutConfirm(true) }}
                className="text-left text-gray-700 hover:text-emerald-700 transition">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href={`/${locale}/auth/login`} onClick={() => setMenuOpen(false)}>{t('signIn')}</Link>
              <Link href={`/${locale}/auth/signup`}
                className="bg-emerald-700 text-white text-center px-5 py-2 rounded-full"
                onClick={() => setMenuOpen(false)}>
                {t('getStarted')}
              </Link>
            </>
          )}
        </div>
      )}
    </nav>

      {/* 로그아웃 확인 모달 */}
      {logoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setLogoutConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-80 text-center modal-enter"
            onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">로그아웃 하시겠습니까?</h3>
            <p className="text-sm text-gray-500 mb-6">현재 로그인 상태가 종료됩니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition">
                취소
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white font-medium hover:bg-emerald-800 transition">
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
