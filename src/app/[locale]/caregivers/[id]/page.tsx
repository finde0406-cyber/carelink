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
  const locale = useLocale()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [caregiver, setCaregiver] = useState<CaregiverDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showContactModal, setShowContactModal] = useState(false)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [canReview, setCanReview] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [hasReviewed, setHasReviewed] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewMessage, setReviewMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push(`/${locale}/auth/login`); return }
      setCurrentUserId(user.id)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const { data } = await supabase
        .from('caregiver_profiles')
        .select('*, profiles(full_name, avatar_url), caregiver_availability(day_of_week, time_slot)')
        .eq('id', id)
        .single()

      setCaregiver(data as CaregiverDetail)

      const reviewData = await loadReviews()
      setReviews(reviewData)

      const alreadyReviewed = reviewData.some(r => r.reviewer_id === user.id)
      setHasReviewed(alreadyReviewed)

      const eligible = profileData?.role === 'family' && data?.user_id !== user.id
      setCanReview(!!eligible)

      setLoading(false)
    }
    load()
  }, [id])

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
    const refreshed = await loadReviews()
    setReviews(refreshed)
    setReviewSubmitting(false)
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
            {/* Avatar */}
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

          {/* 전문 분야 태그 */}
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
          <AvailabilityGrid
            availability={caregiver.caregiver_availability}
            editable={false}
          />
        </div>

        {/* Reviews */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-gray-900">
              {t('reviewsTitle')}
              {reviewCount > 0 && (
                <span className="ml-2 text-amber-500 font-extrabold">
                  ★ {avgRating.toFixed(1)}
                </span>
              )}
            </h2>
            <span className="text-sm text-gray-400">{reviewCount}개</span>
          </div>

          {/* 후기 작성 폼 */}
          {canReview && !hasReviewed && (
            <form onSubmit={handleSubmitReview}
              className="mb-6 p-5 bg-gray-50 rounded-2xl border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">{t('writeReview')}</h3>

              <p className="text-xs text-gray-500 mb-2">{t('ratingLabel')}</p>
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
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

              <button
                type="submit"
                disabled={reviewRating === 0 || reviewSubmitting}
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

          {/* 후기 목록 */}
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
