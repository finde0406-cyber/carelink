'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)

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
      setLoading(false)
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push(`/${locale}`)
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
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700">
            {t('logout')}
          </button>
        </div>
      </header>

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
              <div className="bg-white border border-gray-200 rounded-2xl p-6 opacity-60">
                <div className="text-3xl mb-3">📅</div>
                <h3 className="font-bold text-gray-900 mb-1">{t('bookings')}</h3>
                <p className="text-sm text-gray-500">{t('comingSoon')}</p>
              </div>
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
      </main>
    </div>
  )
}
