'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import AvailabilityGrid, { AvailItem } from '@/components/caregivers/AvailabilityGrid'

interface CaregiverDetail {
  id: string
  user_id: string
  license_type: string
  license_number: string
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

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer_id: string
  profiles: { full_name: string } | null
}

const TIME_SLOTS = [
  '오전 9:00', '오전 10:00', '오전 11:00',
  '오후 1:00', '오후 2:00', '오후 3:00', '오후 4:00', '오후 5:00',
]

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'text-2xl' : 'text-base'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className={`${cls} ${s <= rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
      ))}
    </div>
  )
}

export default function CaregiverDetailPage() {
  const t = useTranslations('caregiverDetail')
  const tC = useTranslations('consultation')
  const locale = useLocale()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [caregiver, setCaregiver] = useState<CaregiverDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [canReview, setCanReview] = useState(false)
  const [canBook, setCanBook] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [hasReviewed, setHasReviewed] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewMessage, setReviewMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 즐겨찾기
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteId, setFavoriteId] = useState<string | null>(null)
  const [favLoading, setFavLoading] = useState(false)

  // 상담 예약 모달
  const [showConsultModal, setShowConsultModal] = useState(false)
  const [consultDate, setConsultDate] = useState('')
  const [consultTime, setConsultTime] = useState('')
  const [consultNotes, setConsultNotes] = useState('')
  const [consultSubmitting, setConsultSubmitting] = useState(false)
  const [consultMessage, setConsultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const today = new Date().toISOString().split('T')[0]

  async function loadReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles(full_name)')
      .eq('caregiver_id', id)
      .order('created_at', { ascending: false })
    return (data as Review[]) || []
  }

  useEffect(() => {
    async function load() {
      // 프로필 데이터는 비로그인도 조회 가능
      const { data } = await supabase
        .from('caregiver_profiles')
        .select('*, profiles(full_name, avatar_url), caregiver_availability(day_of_week, time_slot)')
        .eq('id', id)
        .single()

      setCaregiver(data as CaregiverDetail)

      const reviewData = await loadReviews()
      setReviews(reviewData)

      // 로그인 상태면 추가 기능 활성화
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)

        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        setHasReviewed(reviewData.some(r => r.reviewer_id === user.id))

        const eligible = profileData?.role === 'family' && data?.user_id !== user.id
        setCanReview(!!eligible)
        setCanBook(profileData?.role === 'family')

        const { data: favData } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('caregiver_id', id)
          .maybeSingle()
        setIsFavorite(!!favData)
        if (favData) setFavoriteId(favData.id)
      }

      setLoading(false)
    }
    load()
  }, [id])

  async function toggleFavorite() {
    if (!currentUserId || favLoading) return
    setFavLoading(true)
    if (isFavorite && favoriteId) {
      await supabase.from('favorites').delete().eq('id', favoriteId)
      setIsFavorite(false)
      setFavoriteId(null)
    } else {
      const { data } = await supabase
        .from('favorites')
        .insert({ user_id: currentUserId, caregiver_id: id })
        .select('id')
        .single()
      setIsFavorite(true)
      if (data) setFavoriteId(data.id)
    }
    setFavLoading(false)
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault()
    if (reviewRating === 0 || !currentUserId) return
    setReviewSubmitting(true)
    setReviewMessage(null)

    const { error } = await supabase.from('reviews').insert({
      caregiver_id: id,
      reviewer_id: currentUserId,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    })

    if (error) {
      setReviewMessage({ type: 'error', text: t('reviewError') })
      setReviewSubmitting(false)
      return
    }

    setReviewMessage({ type: 'success', text: t('reviewSuccess') })
    setHasReviewed(true)
    setReviews(await loadReviews())
    setReviewSubmitting(false)
  }

  async function handleConsultSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!consultDate || !consultTime || !currentUserId) return
    setConsultSubmitting(true)
    setConsultMessage(null)

    const { error } = await supabase.from('consultations').insert({
      family_id: currentUserId,
      caregiver_id: id,
      requested_date: consultDate,
      requested_time: consultTime,
      notes: consultNotes.trim() || null,
    })

    if (error) {
      setConsultMessage({ type: 'error', text: tC('errorMsg') })
    } else {
      setConsultMessage({ type: 'success', text: tC('successMsg') })
      setTimeout(() => {
        setShowConsultModal(false)
        setConsultDate('')
        setConsultTime('')
        setConsultNotes('')
        setConsultMessage(null)
      }, 1500)
    }
    setConsultSubmitting(false)
  }

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
  const avgRating = caregiver.avg_rating || 0
  const reviewCount = reviews.length

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
            <div className="shrink-0">
              {caregiver.profiles?.avatar_url ? (
                <img
                  src={caregiver.profiles.avatar_url}
                  alt={name}
                  className="w-20 h-20 rounded-2xl object-cover border border-gray-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <span className="text-2xl font-extrabold text-emerald-700">{initials}</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-extrabold text-gray-900">{name}</h1>
                  <p className="text-emerald-700 font-semibold mt-0.5">{caregiver.license_type}</p>
                  <p className="text-sm text-gray-500 mt-1">📍 {caregiver.region}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* 즐겨찾기 버튼 */}
                  <button
                    onClick={toggleFavorite}
                    disabled={favLoading}
                    title={isFavorite ? t('favoriteRemove') : t('favoriteAdd')}
                    className={`w-10 h-10 rounded-full border flex items-center justify-center text-lg
                      transition disabled:opacity-50
                      ${isFavorite
                        ? 'border-red-300 bg-red-50 text-red-500'
                        : 'border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-400 hover:text-red-400'
                      }`}>
                    {isFavorite ? '♥' : '♡'}
                  </button>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full
                    ${caregiver.available
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'}`}>
                    {caregiver.available ? t('available') : t('unavailable')}
                  </span>
                </div>
              </div>

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
                {reviewCount > 0 && (
                  <>
                    <div className="w-px bg-gray-100" />
                    <div className="text-center">
                      <div className="text-xl font-extrabold text-amber-500">
                        ★ {avgRating.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {reviewCount}{t('reviewsUnit')}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 상담 예약 버튼 */}
          {canBook && (
            <button
              onClick={() => setShowConsultModal(true)}
              className="w-full mt-6 bg-emerald-700 text-white py-3.5 rounded-xl font-semibold
                hover:bg-emerald-800 transition text-sm">
              {t('consultBtn')}
            </button>
          )}
        </div>

        {/* Bio */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <h2 className="text-base font-bold text-gray-900 mb-4">{t('bioTitle')}</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{caregiver.bio}</p>

          {caregiver.specialties?.length > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('specialtiesTitle')}</p>
              <div className="flex flex-wrap gap-2">
                {caregiver.specialties.map(s => (
                  <span key={s}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm rounded-full font-medium border border-emerald-100">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <h2 className="text-base font-bold text-gray-900 mb-1">{t('scheduleTitle')}</h2>
          <p className="text-xs text-gray-400 mb-5">초록색 = 근무 가능</p>
          <AvailabilityGrid availability={caregiver.caregiver_availability} editable={false} />
        </div>

        {/* Reviews */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-gray-900">
              {t('reviewsTitle')}
              {reviewCount > 0 && (
                <span className="ml-2 text-amber-500 font-extrabold">★ {avgRating.toFixed(1)}</span>
              )}
            </h2>
            <span className="text-sm text-gray-400">{reviewCount}개</span>
          </div>

          {canReview && !hasReviewed && (
            <form onSubmit={handleSubmitReview}
              className="mb-6 p-5 bg-gray-50 rounded-2xl border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">{t('writeReview')}</h3>
              <p className="text-xs text-gray-500 mb-2">{t('ratingLabel')}</p>
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setReviewRating(star)}
                    className={`text-3xl transition-transform hover:scale-110
                      ${star <= reviewRating ? 'text-amber-400' : 'text-gray-200'}`}>
                    ★
                  </button>
                ))}
              </div>
              <label className="block text-xs text-gray-500 mb-1.5">{t('commentLabel')}</label>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder={t('commentPlaceholder')}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                  focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition resize-none mb-3 bg-white"
              />
              {reviewMessage && (
                <p className={`text-sm mb-3 ${reviewMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {reviewMessage.text}
                </p>
              )}
              <button type="submit" disabled={reviewRating === 0 || reviewSubmitting}
                className="w-full bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold
                  hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed">
                {reviewSubmitting ? t('reviewSubmitting') : t('submitReview')}
              </button>
            </form>
          )}

          {hasReviewed && (
            <div className="mb-6 p-4 bg-emerald-50 rounded-xl text-sm text-emerald-700 text-center font-medium">
              {t('alreadyReviewed')}
            </div>
          )}

          {reviewCount === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{t('noReviews')}</p>
          ) : (
            <div className="space-y-5">
              {reviews.map(r => (
                <div key={r.id} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-gray-800">
                      {r.profiles?.full_name || '익명'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <StarRow rating={r.rating} />
                  {r.comment && (
                    <p className="text-sm text-gray-600 leading-relaxed mt-2">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* 상담 예약 모달 */}
      {showConsultModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0"
          onClick={() => !consultSubmitting && setShowConsultModal(false)}>
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{tC('modalTitle')}</h3>
              <button
                onClick={() => setShowConsultModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                ✕
              </button>
            </div>

            <form onSubmit={handleConsultSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {tC('dateLabel')}
                </label>
                <input
                  type="date"
                  value={consultDate}
                  min={today}
                  onChange={e => setConsultDate(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                    focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {tC('timeLabel')}
                </label>
                <select
                  value={consultTime}
                  onChange={e => setConsultTime(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                    focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition bg-white">
                  <option value="">시간 선택</option>
                  {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {tC('notesLabel')}
                </label>
                <textarea
                  value={consultNotes}
                  onChange={e => setConsultNotes(e.target.value)}
                  placeholder={tC('notesPlaceholder')}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                    focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition resize-none"
                />
              </div>

              {consultMessage && (
                <p className={`text-sm ${consultMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {consultMessage.text}
                </p>
              )}

              <button
                type="submit"
                disabled={consultSubmitting}
                className="w-full bg-emerald-700 text-white py-3.5 rounded-xl font-semibold text-sm
                  hover:bg-emerald-800 transition disabled:opacity-60">
                {consultSubmitting ? tC('submitting') : tC('submitBtn')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
