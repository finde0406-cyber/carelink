'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import LanguageSwitcher from './LanguageSwitcher'

export default function Navbar() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={`/${locale}`} className="text-2xl font-extrabold tracking-tight text-emerald-700">
          Care<span className="text-amber-400">Link</span>
        </Link>

        <div className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-600">
          <Link href={`/${locale}/search`} className="hover:text-emerald-700 transition">{t('findCaregivers')}</Link>
          <Link href={`/${locale}/partners`} className="hover:text-emerald-700 transition">{t('forCaregivers')}</Link>
          <Link href={`/${locale}/auth/login`} className="hover:text-emerald-700 transition">{t('signIn')}</Link>
          <LanguageSwitcher />
          <Link href={`/${locale}/auth/signup`}
            className="bg-emerald-700 text-white px-5 py-2 rounded-full hover:bg-emerald-800 transition">
            {t('getStarted')}
          </Link>
        </div>

        <div className="md:hidden flex items-center gap-3">
          <LanguageSwitcher />
          <button className="p-2" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="w-5 h-0.5 bg-gray-700 mb-1" />
            <div className="w-5 h-0.5 bg-gray-700 mb-1" />
            <div className="w-5 h-0.5 bg-gray-700" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4 text-sm font-medium text-gray-700">
          <Link href={`/${locale}/search`} onClick={() => setMenuOpen(false)}>{t('findCaregivers')}</Link>
          <Link href={`/${locale}/partners`} onClick={() => setMenuOpen(false)}>{t('forCaregivers')}</Link>
          <Link href={`/${locale}/auth/login`} onClick={() => setMenuOpen(false)}>{t('signIn')}</Link>
          <Link href={`/${locale}/auth/signup`}
            className="bg-emerald-700 text-white text-center px-5 py-2 rounded-full"
            onClick={() => setMenuOpen(false)}>
            {t('getStarted')}
          </Link>
        </div>
      )}
    </nav>
  )
}
