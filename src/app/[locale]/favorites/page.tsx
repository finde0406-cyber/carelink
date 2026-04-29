'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface FavoriteItem {
  id: string
  caregiver_id: string
  caregiver_profiles: {
    id: string
    license_type: string
    region: string
    hourly_rate: number
    avg_rating: number
    review_count: number
    available: boolean
    profiles: { full_name: string; avatar_url: string | null } | null
  } | null
}

export default function FavoritesPage() {
  const t = useTranslations('favorites')
  const locale = useLocale()
  const router = useRouter()
  const supabase = createClient()

  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push(`/${locale}/auth/login`); return }

      const { data } = await supabase
        .from('favorites')
        .select(`
          id,
          caregiver_id,
          caregiver_profiles (
            id, license_type, region, hourly_rate, avg_rating, review_count, available,
            profiles (full_name, avatar_url)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setFavorites((data as unknown as FavoriteItem[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  async function removeFavorite(favoriteId: string) {
    await supabase.from('favorites').delete().eq('id', favoriteId)
    setFavorites(prev => prev.filter(f => f.id !== favoriteId))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pt-16">

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-8">{t('listTitle')}</h1>

        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">♡</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('empty')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('emptyDesc')}</p>
            <Link href={`/${locale}/search`}
              className="bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold text-sm
                hover:bg-emerald-800 transition">
              요양보호사 찾기 →
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {favorites.map(f => {
              const c = f.caregiver_profiles
              if (!c) return null
              const name = c.profiles?.full_name || '—'
              const initials = name !== '—' ? name.slice(0, 2) : '?'
              return (
                <div key={f.id} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {c.profiles?.avatar_url ? (
                        <img
                          src={c.profiles.avatar_url}
                          alt={name}
                          className="w-11 h-11 rounded-full object-cover border border-gray-100 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-extrabold text-emerald-700">{initials}</span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-gray-900">{name}</h3>
                        <p className="text-sm text-emerald-700">{c.license_type}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFavorite(f.id)}
                      title="즐겨찾기 해제"
                      className="text-red-400 hover:text-red-600 transition text-xl leading-none">
                      ♥
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                    <span>📍 {c.region}</span>
                    <span>💰 {c.hourly_rate.toLocaleString()}원/시간</span>
                    {c.review_count > 0 && (
                      <span>⭐ {c.avg_rating?.toFixed(1)} ({c.review_count})</span>
                    )}
                    <span className={`font-medium ${c.available ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {c.available ? '구직 중' : '매칭 불가'}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <Link
                      href={`/${locale}/caregivers/${c.id}`}
                      className="flex-1 text-center border border-emerald-600 text-emerald-700 py-2.5
                        rounded-xl text-sm font-semibold hover:bg-emerald-50 transition">
                      {t('viewDetail')}
                    </Link>
                    <Link
                      href={`/${locale}/caregivers/${c.id}`}
                      className="flex-1 text-center bg-emerald-700 text-white py-2.5 rounded-xl
                        text-sm font-semibold hover:bg-emerald-800 transition">
                      {t('consultBtn')}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
