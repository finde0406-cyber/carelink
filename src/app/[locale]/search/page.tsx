'use client'

import { useState, useEffect, useMemo } from 'react'
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

const SPECIALTY_OPTIONS = [
  '치매케어', '요양보호', '재활케어', '간호보조',
  '복지상담', '소아케어', '법률상담', '세무상담', '상속플랜',
]

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

type SortKey = 'latest' | 'rating' | 'experience' | 'rate_low'
type ExpRange = 'all' | 'lt1' | '1_3' | '3_5' | 'gt5'

export default function SearchPage() {
  const t = useTranslations('search')
  const locale = useLocale()
  const router = useRouter()
  const supabase = createClient()

  const [sido, setSido] = useState('')
  const [gungu, setGungu] = useState('')
  const [rawResults, setRawResults] = useState<CaregiverCard[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationMsg, setLocationMsg] = useState<string | null>(null)
  const [showFilter, setShowFilter] = useState(false)

  // filters
  const [sortKey, setSortKey] = useState<SortKey>('latest')
  const [expRange, setExpRange] = useState<ExpRange>('all')
  const [selectedSpecialties, setSelectedSpecialties] = useState<Set<string>>(new Set())

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [favLoading, setFavLoading] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)
      const { data } = await supabase
        .from('favorites')
        .select('caregiver_id')
        .eq('user_id', user.id)
      setFavoriteIds(new Set((data || []).map((f: { caregiver_id: string }) => f.caregiver_id)))
    }
    init()
  }, [])

  const results = useMemo(() => {
    let list = [...rawResults]

    // experience filter
    list = list.filter(c => {
      if (expRange === 'all') return true
      if (expRange === 'lt1') return c.experience_years < 1
      if (expRange === '1_3') return c.experience_years >= 1 && c.experience_years < 3
      if (expRange === '3_5') return c.experience_years >= 3 && c.experience_years < 5
      if (expRange === 'gt5') return c.experience_years >= 5
      return true
    })

    // specialty filter
    if (selectedSpecialties.size > 0) {
      list = list.filter(c =>
        (c.specialties || []).some(s => selectedSpecialties.has(s))
      )
    }

    // sort
    list.sort((a, b) => {
      if (sortKey === 'rating') return (b.avg_rating || 0) - (a.avg_rating || 0)
      if (sortKey === 'experience') return b.experience_years - a.experience_years
      if (sortKey === 'rate_low') return a.hourly_rate - b.hourly_rate
      return 0
    })

    return list
  }, [rawResults, sortKey, expRange, selectedSpecialties])

  async function toggleFavorite(caregiverId: string) {
    if (!currentUserId) { router.push(`/${locale}/auth/login`); return }
    if (favLoading) return
    setFavLoading(caregiverId)
    if (favoriteIds.has(caregiverId)) {
      await supabase.from('favorites').delete()
        .eq('user_id', currentUserId).eq('caregiver_id', caregiverId)
      setFavoriteIds(prev => { const s = new Set(prev); s.delete(caregiverId); return s })
    } else {
      await supabase.from('favorites').insert({ user_id: currentUserId, caregiver_id: caregiverId })
      setFavoriteIds(prev => new Set([...prev, caregiverId]))
    }
    setFavLoading(null)
  }

  async function handleGetLocation() {
    if (!navigator.geolocation) { setLocationMsg('이 브라우저는 위치 서비스를 지원하지 않습니다.'); return }
    setLocating(true); setLocationMsg(null)
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
        } else {
          setLocationMsg('시/도를 직접 선택해주세요.')
        }
      }
    } catch (err: unknown) {
      const code = (err as GeolocationPositionError)?.code
      setLocationMsg(code === 1 ? '위치 권한이 거부됐습니다.' : '위치를 가져올 수 없습니다.')
    }
    setLocating(false)
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setSearched(true); setSearchError(null)
    try {
      const region = formatRegion(sido, gungu)
      let query = supabase
        .from('caregiver_profiles')
        .select('*, profiles(full_name, avatar_url), caregiver_availability(day_of_week, time_slot)')

      if (region) query = query.ilike('region', `%${region}%`)

      const { data, error } = await query.limit(50)
      if (error) throw new Error(error.message)
      setRawResults((data as CaregiverCard[]) || [])
    } catch {
      setSearchError('검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setRawResults([])
    }
    setLoading(false)
  }

  const toggleSpecialty = (s: string) => {
    setSelectedSpecialties(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  const resetFilters = () => {
    setSortKey('latest'); setExpRange('all'); setSelectedSpecialties(new Set())
  }

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'latest', label: t('sortLatest') },
    { key: 'rating', label: t('sortRating') },
    { key: 'experience', label: t('sortExperience') },
    { key: 'rate_low', label: t('sortRateLow') },
  ]

  const expOptions: { key: ExpRange; label: string }[] = [
    { key: 'all', label: t('expAll') },
    { key: 'lt1', label: t('exp1') },
    { key: '1_3', label: t('exp2') },
    { key: '3_5', label: t('exp3') },
    { key: 'gt5', label: t('exp4') },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}`} className="text-xl font-extrabold text-emerald-700">
            Care<span className="text-amber-400">Link</span>
          </Link>
          {currentUserId ? (
            <Link href={`/${locale}/dashboard`} className="text-sm text-gray-500 hover:text-gray-700">
              {t('backToDashboard')}
            </Link>
          ) : (
            <Link href={`/${locale}`} className="text-sm text-gray-500 hover:text-gray-700">
              ← 홈
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t('subtitle')}</p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
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
                title={t('locationBtn')}
                className="shrink-0 border border-gray-200 rounded-xl px-3.5 hover:border-emerald-400
                  hover:bg-emerald-50 transition disabled:opacity-50 flex items-center justify-center">
                {locating
                  ? <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  : <span className="text-base">📍</span>}
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
          {locating && <p className="text-xs text-emerald-600 mt-2">📡 {t('locating')}</p>}
          {locationMsg && <p className="text-xs text-red-500 mt-2">{locationMsg}</p>}
        </form>

        {/* Filter bar (only after search) */}
        {searched && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              {rawResults.length > 0 && (
                <span className="text-sm text-gray-500">
                  <span className="font-bold text-gray-900">{results.length}</span>명 {t('resultCount')}
                </span>
              )}
              <button
                onClick={() => setShowFilter(v => !v)}
                className={`ml-auto flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full border transition
                  ${showFilter
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-400'}`}>
                <span>⚙</span> {t('filterBtn')}
                {(expRange !== 'all' || selectedSpecialties.size > 0) && (
                  <span className="w-2 h-2 bg-amber-400 rounded-full" />
                )}
              </button>
            </div>

            {/* Sort tabs */}
            <div className="flex gap-2 flex-wrap mb-3">
              {sortOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortKey(opt.key)}
                  className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition
                    ${sortKey === opt.key
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-400'}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Expandable filter panel */}
            {showFilter && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
                {/* Experience */}
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{t('expLabel')}</p>
                  <div className="flex gap-2 flex-wrap">
                    {expOptions.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setExpRange(opt.key)}
                        className={`text-xs px-3 py-1.5 rounded-full font-semibold transition
                          ${expRange === opt.key
                            ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                            : 'bg-gray-100 text-gray-600 border border-transparent hover:border-emerald-300'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specialties */}
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{t('specialtyLabel')}</p>
                  <div className="flex gap-2 flex-wrap">
                    {SPECIALTY_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => toggleSpecialty(s)}
                        className={`text-xs px-3 py-1.5 rounded-full font-semibold transition
                          ${selectedSpecialties.has(s)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={resetFilters}
                  className="text-xs text-gray-400 hover:text-red-500 transition font-medium">
                  {t('filterReset')} ↺
                </button>
              </div>
            )}
          </div>
        )}

        {/* 에러 */}
        {searchError && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl px-5 py-4 text-sm mb-6">
            {searchError}
          </div>
        )}

        {/* Empty state */}
        {searched && !loading && rawResults.length > 0 && results.length === 0 && (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-500 text-sm">필터 조건에 맞는 전문가가 없습니다.</p>
            <button onClick={resetFilters} className="mt-3 text-emerald-600 text-sm font-semibold hover:underline">
              필터 초기화
            </button>
          </div>
        )}

        {searched && !loading && rawResults.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('noResults')}</h3>
            <p className="text-sm text-gray-500">{t('noResultsDesc')}</p>
          </div>
        )}

        {/* Result grid */}
        {results.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {results.map(c => {
              const availDays = new Set(c.caregiver_availability?.map(a => a.day_of_week) ?? [])
              const topSpecialties = (c.specialties || []).slice(0, 3)
              const isFav = favoriteIds.has(c.id)
              return (
                <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition flex flex-col">
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
                        <h3 className="font-bold text-gray-900 text-base">{c.profiles?.full_name || '—'}</h3>
                        <p className="text-sm text-emerald-700 font-medium">{c.license_type}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full
                      ${c.available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.available ? t('available') : t('unavailable')}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{c.bio}</p>

                  {topSpecialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {topSpecialties.map(s => (
                        <span key={s} className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium">
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

                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                    <span>📍 {c.region}</span>
                    <span>🕐 {c.experience_years}{t('years')}</span>
                    <span>💰 {c.hourly_rate.toLocaleString()}{t('perHour')}</span>
                    {c.review_count > 0 && (
                      <span>⭐ {c.avg_rating?.toFixed(1)} ({c.review_count}{t('reviews')})</span>
                    )}
                  </div>

                  <div className="flex gap-1 mb-4">
                    {DAY_SHORT.map((label, i) => (
                      <div key={i}
                        className={`flex-1 h-6 rounded-md text-[10px] font-bold flex items-center justify-center transition
                          ${availDays.has(i)
                            ? i >= 5 ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500 text-white'
                            : 'bg-gray-100 text-gray-300'}`}>
                        {label}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <Link
                      href={`/${locale}/caregivers/${c.id}`}
                      className="flex-1 text-center border border-emerald-600 text-emerald-700 py-2.5
                        rounded-xl text-sm font-semibold hover:bg-emerald-50 transition">
                      {t('viewDetail')}
                    </Link>
                    <button
                      onClick={() => toggleFavorite(c.id)}
                      disabled={favLoading === c.id}
                      title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                      className={`px-4 py-2.5 rounded-xl text-lg font-semibold transition disabled:opacity-50
                        ${isFav
                          ? 'bg-red-50 border border-red-300 text-red-500'
                          : 'bg-gray-100 border border-gray-200 text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-400'}`}>
                      {isFav ? '♥' : '♡'}
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
