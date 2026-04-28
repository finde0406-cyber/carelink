'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { SIDO_LIST, getGunguList, formatRegion } from '@/constants/regions'

interface AvailItem { day_of_week: number; time_slot: string }

interface CaregiverCard {
  id: string
  license_type: string
  experience_years: number
  region: string
  hourly_rate: number
  bio: string
  available: boolean
  avg_rating: number
  review_count: number
  specialties: string[]
  profiles: { full_name: string; avatar_url?: string | null } | null
  caregiver_availability: AvailItem[]
}

const DAY_SHORT = ['월', '화', '수', '목', '금', '토', '일']

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko`,
    { headers: { 'User-Agent': 'CareLink/1.0' } }
  )
  const data = await res.json()
  const addr = data.address || {}
  const parts = [
    addr.city || addr.town || addr.county || addr.state,
    addr.suburb || addr.neighbourhood || addr.district,
  ].filter(Boolean)
  return parts.join(' ') || data.display_name?.split(',').slice(0, 2).join(', ') || ''
}

export default function SearchPage() {
  const t = useTranslations('search')
  const locale = useLocale()
  const router = useRouter()
  const supabase = createClient()

  const [sido, setSido] = useState('')
  const [gungu, setGungu] = useState('')
  const [results, setResults] = useState<CaregiverCard[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationMsg, setLocationMsg] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push(`/${locale}/auth/login`)
    }
    checkAuth()
  }, [])

  async function handleGetLocation() {
    if (!navigator.geolocation) {
      setLocationMsg('이 브라우저는 위치 서비스를 지원하지 않습니다.')
      return
    }
    setLocating(true)
    setLocationMsg(null)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
      const address = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
      if (address) {
        const matchedSido = SIDO_LIST.find(s =>
          address.includes(s.replace('특별시','').replace('광역시','').replace('특별자치시','').replace('특별자치도','').replace('도',''))
        ) || ''
        if (matchedSido) {
          setSido(matchedSido)
          const gunguList = getGunguList(matchedSido)
          const matchedGungu = gunguList.find(g => address.includes(g.split(' ')[0])) || ''
          setGungu(matchedGungu)
          setLocationMsg(null)
        } else {
          setLocationMsg('시/도를 직접 선택해주세요.')
        }
      }
    } catch (err: unknown) {
      const code = (err as GeolocationPositionError)?.code
      if (code === 1) {
        setLocationMsg('위치 권한이 거부됐습니다. Windows 설정 → 개인 정보 → 위치에서 허용해주세요.')
      } else {
        setLocationMsg('위치를 가져올 수 없습니다. 직접 선택해주세요.')
      }
    }
    setLocating(false)
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSearched(true)

    const region = formatRegion(sido, gungu)

    let query = supabase
      .from('caregiver_profiles')
      .select('*, profiles(full_name, avatar_url), caregiver_availability(day_of_week, time_slot)')
      .eq('available', true)

    if (region) {
      query = query.ilike('region', `%${region}%`)
    }

    const { data } = await query.order('created_at', { ascending: false }).limit(20)
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
            {t('backToDashboard')}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t('subtitle')}</p>
        </div>

        <form onSubmit={handleSearch} className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('regionLabel')}</label>
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <div className="flex gap-2 flex-1">
              <select
                value={sido}
                onChange={e => { setSido(e.target.value); setGungu('') }}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none
                  focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition bg-white">
                <option value="">전체 지역</option>
                {SIDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locating}
                title="현재 위치"
                className="shrink-0 border border-gray-200 rounded-xl px-3.5 hover:border-emerald-400
                  hover:bg-emerald-50 transition disabled:opacity-50 flex items-center justify-center">
                {locating
                  ? <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  : <span className="text-base">📍</span>
                }
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold text-sm
                hover:bg-emerald-800 transition disabled:opacity-60 whitespace-nowrap">
              {loading ? '...' : t('searchBtn')}
            </button>
          </div>
          {sido && (
            <select
              value={gungu}
              onChange={e => setGungu(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none
                focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition bg-white">
              <option value="">전체 구/군</option>
              {getGunguList(sido).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
          {locating && <p className="text-xs text-emerald-600 mt-2">📡 위치 확인 중...</p>}
          {locationMsg && <p className="text-xs text-red-500 mt-2">{locationMsg}</p>}
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
            {results.map(c => {
              const availDays = new Set(c.caregiver_availability?.map(a => a.day_of_week) ?? [])
              const topSpecialties = (c.specialties || []).slice(0, 3)
              return (
                <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {c.profiles?.avatar_url ? (
                        <img
                          src={c.profiles.avatar_url}
                          alt={c.profiles?.full_name || ''}
                          className="w-11 h-11 rounded-full object-cover border border-gray-100 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-extrabold text-emerald-700">
                            {(c.profiles?.full_name || '?').slice(0, 2)}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">
                          {c.profiles?.full_name || '—'}
                        </h3>
                        <p className="text-sm text-emerald-700 font-medium">{c.license_type}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full
                      ${c.available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.available ? t('available') : t('unavailable')}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{c.bio}</p>

                  {/* 전문 분야 태그 */}
                  {topSpecialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {topSpecialties.map(s => (
                        <span key={s}
                          className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium">
                          {s}
                        </span>
                      ))}
                      {(c.specialties || []).length > 3 && (
                        <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full">
                          +{(c.specialties || []).length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                    <span>📍 {c.region}</span>
                    <span>🕐 {c.experience_years}{t('years')}</span>
                    <span>💰 {c.hourly_rate.toLocaleString()}{t('perHour')}</span>
                    {c.review_count > 0 && (
                      <span>⭐ {c.avg_rating?.toFixed(1)} ({c.review_count}{t('reviews')})</span>
                    )}
                  </div>

                  {/* Availability dots */}
                  <div className="flex gap-1 mb-4">
                    {DAY_SHORT.map((label, i) => (
                      <div key={i}
                        className={`flex-1 h-6 rounded-md text-[10px] font-bold flex items-center justify-center
                          transition
                          ${availDays.has(i)
                            ? i >= 5
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-emerald-500 text-white'
                            : 'bg-gray-100 text-gray-300'
                          }`}>
                        {label}
                      </div>
                    ))}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 mt-auto">
                    <Link
                      href={`/${locale}/caregivers/${c.id}`}
                      className="flex-1 text-center border border-emerald-600 text-emerald-700 py-2.5 rounded-xl
                        text-sm font-semibold hover:bg-emerald-50 transition">
                      {t('viewDetail')}
                    </Link>
                    <button
                      className="flex-1 bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold
                        hover:bg-emerald-800 transition">
                      {t('contact')}
                    </button>
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
