'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface CaregiverCard {
  id: string
  user_id: string
  license_type: string
  experience_years: number
  region: string
  hourly_rate: number
  bio: string
  available: boolean
  rating: number
  review_count: number
  profiles: { full_name: string } | null
}

export default function SearchPage() {
  const t = useTranslations('search')
  const locale = useLocale()
  const router = useRouter()
  const supabase = createClient()

  const [region, setRegion] = useState('')
  const [results, setResults] = useState<CaregiverCard[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push(`/${locale}/auth/login`)
    }
    checkAuth()
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSearched(true)

    let query = supabase
      .from('caregiver_profiles')
      .select('*, profiles(full_name)')
      .eq('available', true)

    if (region.trim()) {
      query = query.ilike('region', `%${region.trim()}%`)
    }

    const { data } = await query.order('rating', { ascending: false }).limit(20)
    setResults((data as CaregiverCard[]) || [])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}`} className="text-xl font-extrabold text-emerald-700">
            Care<span className="text-amber-400">Link</span>
          </Link>
          <Link href={`/${locale}/dashboard`} className="text-sm text-gray-500 hover:text-gray-700">
            ← 대시보드
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t('subtitle')}</p>
        </div>

        <form onSubmit={handleSearch} className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('regionLabel')}</label>
            <input
              type="text"
              value={region}
              onChange={e => setRegion(e.target.value)}
              placeholder={t('regionPlaceholder')}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold text-sm
                hover:bg-emerald-800 transition disabled:opacity-60 whitespace-nowrap">
              {loading ? '...' : t('searchBtn')}
            </button>
          </div>
        </form>

        {searched && !loading && results.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('noResults')}</h3>
            <p className="text-sm text-gray-500">{t('noResultsDesc')}</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {results.map(c => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      {c.profiles?.full_name || '—'}
                    </h3>
                    <p className="text-sm text-emerald-700 font-medium mt-0.5">{c.license_type}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
                    ${c.available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.available ? t('available') : t('unavailable')}
                  </span>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 mb-4">{c.bio}</p>

                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                  <span>📍 {c.region}</span>
                  <span>🕐 {c.experience_years}{t('years')}</span>
                  <span>💰 {c.hourly_rate.toLocaleString()}{t('perHour')}</span>
                  {c.review_count > 0 && (
                    <span>⭐ {c.rating} ({c.review_count}{t('reviews')})</span>
                  )}
                </div>

                <button
                  className="w-full border border-emerald-600 text-emerald-700 py-2.5 rounded-xl text-sm font-semibold
                    hover:bg-emerald-50 transition">
                  {t('contact')}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
