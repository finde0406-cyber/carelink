'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import AvailabilityGrid, { AvailItem } from '@/components/caregivers/AvailabilityGrid'

interface CaregiverDetail {
  id: string
  license_type: string
  license_number: string
  experience_years: number
  region: string
  hourly_rate: number
  bio: string
  available: boolean
  rating: number
  review_count: number
  profiles: { full_name: string } | null
  caregiver_availability: AvailItem[]
}

export default function CaregiverDetailPage() {
  const t = useTranslations('caregiverDetail')
  const locale = useLocale()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [caregiver, setCaregiver] = useState<CaregiverDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showContactModal, setShowContactModal] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push(`/${locale}/auth/login`); return }

      const { data } = await supabase
        .from('caregiver_profiles')
        .select('*, profiles(full_name), caregiver_availability(day_of_week, time_slot)')
        .eq('id', id)
        .single()

      setCaregiver(data as CaregiverDetail)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!caregiver) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-500 mb-4">프로필을 찾을 수 없습니다.</p>
        <Link href={`/${locale}/search`} className="text-emerald-700 font-semibold text-sm hover:underline">
          {t('back')}
        </Link>
      </div>
    </div>
  )

  const name = caregiver.profiles?.full_name || '—'
  const initials = name !== '—' ? name.slice(0, 2) : '?'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}`} className="text-xl font-extrabold text-emerald-700">
            Care<span className="text-amber-400">Link</span>
          </Link>
          <Link href={`/${locale}/search`} className="text-sm text-gray-500 hover:text-gray-700">
            {t('back')}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Hero card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
              <span className="text-2xl font-extrabold text-emerald-700">{initials}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900">{name}</h1>
                  <p className="text-emerald-700 font-semibold mt-0.5">{caregiver.license_type}</p>
                  <p className="text-sm text-gray-500 mt-1">📍 {caregiver.region}</p>
                </div>
                <span className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full
                  ${caregiver.available
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'}`}>
                  {caregiver.available ? t('available') : t('unavailable')}
                </span>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="text-center">
                  <div className="text-xl font-extrabold text-gray-900">{caregiver.experience_years}</div>
                  <div className="text-xs text-gray-400">{t('years')}</div>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="text-center">
                  <div className="text-xl font-extrabold text-gray-900">
                    {caregiver.hourly_rate.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">{t('perHour')}</div>
                </div>
                {caregiver.review_count > 0 && (
                  <>
                    <div className="w-px bg-gray-100" />
                    <div className="text-center">
                      <div className="text-xl font-extrabold text-gray-900">
                        ⭐ {caregiver.rating}
                      </div>
                      <div className="text-xs text-gray-400">
                        {caregiver.review_count}{t('reviewsUnit')}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Contact button */}
          <button
            onClick={() => setShowContactModal(true)}
            className="w-full mt-6 bg-emerald-700 text-white py-3.5 rounded-xl font-semibold
              hover:bg-emerald-800 transition text-sm">
            {t('contact')}
          </button>
        </div>

        {/* Bio */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <h2 className="text-base font-bold text-gray-900 mb-4">{t('bioTitle')}</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{caregiver.bio}</p>
        </div>

        {/* Schedule */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <h2 className="text-base font-bold text-gray-900 mb-1">{t('scheduleTitle')}</h2>
          <p className="text-xs text-gray-400 mb-5">초록색 = 근무 가능</p>
          <AvailabilityGrid
            availability={caregiver.caregiver_availability}
            editable={false}
          />
        </div>

      </main>

      {/* Contact modal */}
      {showContactModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0"
          onClick={() => setShowContactModal(false)}>
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">채팅 기능 준비 중</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{t('contactSoon')}</p>
            <button
              onClick={() => setShowContactModal(false)}
              className="mt-6 w-full border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-semibold
                hover:bg-gray-50 transition">
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
