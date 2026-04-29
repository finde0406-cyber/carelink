'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import AvailabilityGrid, { AvailItem } from '@/components/caregivers/AvailabilityGrid'

interface SpecialistDetail {
  id: string
  user_id: string
  specialty_type: string
  license_number: string
  experience_years: number
  region: string
  hourly_rate: number
  bio: string
  available: boolean
  approved: boolean
  avg_rating: number
  review_count: number
  specialties: string[]
  profiles: { full_name: string; avatar_url?: string | null } | null
  specialist_availability: AvailItem[]
}

const DAY_SHORT = ['월', '화', '수', '목', '금', '토', '일']

const TIME_SLOTS = [
  '오전 9:00', '오전 10:00', '오전 11:00',
  '오후 1:00', '오후 2:00', '오후 3:00', '오후 4:00', '오후 5:00',
]

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className={`${size === 'lg' ? 'text-2xl' : 'text-base'} ${s <= rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
      ))}
    </div>
  )
}

export default function SpecialistDetailPage() {
  const locale = useLocale()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [specialist, setSpecialist] = useState<SpecialistDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [canBook, setCanBook] = useState(false)
  const [isMyProfile, setIsMyProfile] = useState(false)

  const [showConsultModal, setShowConsultModal] = useState(false)
  const [consultStep, setConsultStep] = useState<1 | 2 | 3 | 'done'>(1)
  const [consultDir, setConsultDir] = useState<'fwd' | 'bwd'>('fwd')
  const [consultDate, setConsultDate] = useState('')
  const [consultTime, setConsultTime] = useState('')
  const [consultNotes, setConsultNotes] = useState('')
  const [consultSubmitting, setConsultSubmitting] = useState(false)
  const [consultError, setConsultError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  function openConsultModal() {
    setConsultStep(1); setConsultDir('fwd')
    setConsultDate(''); setConsultTime(''); setConsultNotes(''); setConsultError('')
    setShowConsultModal(true)
  }

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('specialist_profiles')
          .select('*, profiles(full_name, avatar_url), specialist_availability(day_of_week, time_slot)')
          .eq('id', id)
          .single()
        if (error) throw error
        setSpecialist(data as SpecialistDetail)

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
          setIsMyProfile(data?.user_id === user.id)
          const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
          setCanBook(profileData?.role === 'family')
        }
        setLoading(false)
      } catch {
        setLoadError(true)
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleConsultSubmit() {
    if (!consultDate || !consultTime || !currentUserId) return
    setConsultSubmitting(true); setConsultError('')
    const { error } = await supabase.from('consultations').insert({
      family_id: currentUserId,
      specialist_id: id,
      consultation_type: 'specialist',
      requested_date: consultDate,
      requested_time: consultTime,
      notes: consultNotes.trim() || null,
    })
    if (error) {
      setConsultError('예약 중 오류가 발생했습니다. 다시 시도해주세요.')
    } else {
      setConsultStep('done')
    }
    setConsultSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (loadError || !specialist) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">{loadError ? '⚠️' : '🔍'}</div>
        <p className="text-gray-700 font-semibold mb-2">
          {loadError ? '프로필을 불러오지 못했습니다' : '프로필을 찾을 수 없습니다'}
        </p>
        <Link href={`/${locale}/search`} className="text-blue-700 font-semibold text-sm hover:underline">
          전문가 찾기로 돌아가기
        </Link>
      </div>
    </div>
  )

  const availDays = new Set(specialist.specialist_availability?.map(a => a.day_of_week) ?? [])
  const initials = (specialist.profiles?.full_name || '?').slice(0, 2)

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <main className="max-w-2xl mx-auto px-4 py-8">

        <Link href={`/${locale}/search`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-6 font-medium">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          전문가 찾기
        </Link>

        {/* 내 프로필 배너 */}
        {isMyProfile && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 text-lg">✓</span>
              <p className="text-sm font-semibold text-emerald-800">내 프로필입니다</p>
            </div>
            <Link href={`/${locale}/specialists/profile`}
              className="text-xs font-bold text-emerald-700 border border-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition">
              프로필 수정
            </Link>
          </div>
        )}

        {/* 승인 대기 배너 */}
        {!specialist.approved && isMyProfile && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-5">
            <p className="text-sm font-semibold text-amber-800">⏳ 관리자 승인 대기 중입니다</p>
            <p className="text-xs text-amber-600 mt-1">승인 완료 후 검색에 노출됩니다. 보통 1~2일 소요됩니다.</p>
          </div>
        )}

        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
          <div className="flex items-start gap-4 mb-5">
            {specialist.profiles?.avatar_url
              ? <img src={specialist.profiles.avatar_url} alt="" className="w-20 h-20 rounded-2xl object-cover border border-gray-100 shrink-0" />
              : <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-2xl font-extrabold text-blue-700">{initials}</span>
                </div>
            }
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-extrabold text-gray-900">{specialist.profiles?.full_name || '—'}</h1>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${specialist.available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {specialist.available ? '상담 가능' : '상담 불가'}
                </span>
              </div>
              <p className="text-blue-700 font-semibold text-sm mb-1">{specialist.specialty_type}</p>
              <p className="text-xs text-gray-500">📍 {specialist.region}</p>
              {specialist.avg_rating > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <StarRow rating={Math.round(specialist.avg_rating)} />
                  <span className="text-sm font-bold text-gray-900">{specialist.avg_rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-400">({specialist.review_count}건)</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">경력</p>
              <p className="text-sm font-extrabold text-gray-900">{specialist.experience_years}년</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">상담 요금</p>
              <p className="text-sm font-extrabold text-gray-900">₩{specialist.hourly_rate.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">등록번호</p>
              <p className="text-xs font-semibold text-gray-700 truncate">{specialist.license_number || '—'}</p>
            </div>
          </div>

          {specialist.bio && (
            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <p className="text-xs font-semibold text-gray-500 mb-2">자기소개</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{specialist.bio}</p>
            </div>
          )}

          {specialist.specialties && specialist.specialties.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 mb-2">제공 서비스</p>
              <div className="flex flex-wrap gap-2">
                {specialist.specialties.map(s => (
                  <span key={s} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-100">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-500 mb-2">상담 가능 요일</p>
            <div className="flex gap-1">
              {DAY_SHORT.map((label, i) => (
                <div key={i} className={`flex-1 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition
                  ${availDays.has(i) ? i >= 5 ? 'bg-blue-100 text-blue-600' : 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-300'}`}>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* 예약 버튼 */}
          {!isMyProfile && (
            canBook
              ? <button onClick={openConsultModal} disabled={!specialist.available}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {specialist.available ? '상담 신청하기' : '현재 상담 불가'}
                </button>
              : <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
                  <p className="text-sm text-gray-500">상담 신청은 <strong>가족</strong> 계정으로 로그인 후 이용 가능합니다.</p>
                  <Link href={`/${locale}/auth/login`} className="inline-block mt-2 text-blue-600 text-sm font-semibold hover:underline">로그인하기</Link>
                </div>
          )}
        </div>

        {/* 리뷰 섹션 (준비 중) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">상담 후기</h2>
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-sm">아직 등록된 후기가 없습니다.</p>
          </div>
        </div>
      </main>

      {/* 상담 예약 모달 */}
      {showConsultModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
          onClick={() => !consultSubmitting && setShowConsultModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>

            <div className="h-1 bg-gray-100">
              <div className="h-full bg-blue-500 transition-all duration-500 rounded-full"
                style={{ width: consultStep === 'done' ? '100%' : `${(Number(consultStep) / 3) * 100}%` }} />
            </div>

            <div className="p-6">
              {consultStep !== 'done' && (
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-extrabold text-gray-900">상담 신청</h3>
                  <button onClick={() => setShowConsultModal(false)} className="text-gray-400 hover:text-gray-700 transition text-xl font-light">✕</button>
                </div>
              )}

              {consultStep === 1 && (
                <div className={consultDir === 'fwd' ? 'step-fwd' : 'step-bwd'}>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">1 / 3 단계</p>
                  <h4 className="text-base font-bold text-gray-900 mb-4">상담 날짜를 선택해 주세요</h4>
                  <input type="date" min={today} value={consultDate} onChange={e => setConsultDate(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-blue-500 bg-gray-50 focus:bg-white transition" />
                  <div className="flex justify-end mt-5">
                    <button onClick={() => { if (!consultDate) return; setConsultDir('fwd'); setConsultStep(2) }}
                      disabled={!consultDate}
                      className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-bold text-sm hover:bg-blue-700 transition disabled:opacity-40">
                      다음 →
                    </button>
                  </div>
                </div>
              )}

              {consultStep === 2 && (
                <div className={consultDir === 'fwd' ? 'step-fwd' : 'step-bwd'}>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">2 / 3 단계</p>
                  <h4 className="text-base font-bold text-gray-900 mb-4">상담 시간을 선택해 주세요</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map(slot => (
                      <button key={slot} onClick={() => setConsultTime(slot)}
                        className={`py-3 rounded-2xl text-sm font-semibold border-2 transition active:scale-[0.97]
                          ${consultTime === slot ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:border-blue-400'}`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between mt-5">
                    <button onClick={() => { setConsultDir('bwd'); setConsultStep(1) }}
                      className="text-gray-400 text-sm font-semibold hover:text-gray-700 transition">← 이전</button>
                    <button onClick={() => { if (!consultTime) return; setConsultDir('fwd'); setConsultStep(3) }}
                      disabled={!consultTime}
                      className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-bold text-sm hover:bg-blue-700 transition disabled:opacity-40">
                      다음 →
                    </button>
                  </div>
                </div>
              )}

              {consultStep === 3 && (
                <div className={consultDir === 'fwd' ? 'step-fwd' : 'step-bwd'}>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">3 / 3 단계</p>
                  <h4 className="text-base font-bold text-gray-900 mb-2">메모 (선택사항)</h4>
                  <p className="text-xs text-gray-400 mb-4">상담 내용이나 요청 사항을 미리 적어주세요</p>

                  <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700 font-medium">
                    📅 {consultDate} · {consultTime} · {specialist.profiles?.full_name} {specialist.specialty_type}
                  </div>

                  <textarea value={consultNotes} onChange={e => setConsultNotes(e.target.value)}
                    placeholder="예) 부모님 상속 관련 초기 상담을 원합니다. 부동산 포함 자산 이전 문의입니다."
                    rows={4}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500 bg-gray-50 focus:bg-white transition resize-none" />

                  {consultError && <p className="text-red-500 text-xs mt-2 font-medium">{consultError}</p>}

                  <div className="flex justify-between mt-5">
                    <button onClick={() => { setConsultDir('bwd'); setConsultStep(2) }}
                      className="text-gray-400 text-sm font-semibold hover:text-gray-700 transition">← 이전</button>
                    <button onClick={handleConsultSubmit} disabled={consultSubmitting}
                      className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
                      {consultSubmitting
                        ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> 신청 중...</>
                        : '상담 신청 완료'}
                    </button>
                  </div>
                </div>
              )}

              {consultStep === 'done' && (
                <div className="text-center py-6 fade-up">
                  <div className="text-5xl mb-4">🎉</div>
                  <h4 className="text-xl font-extrabold text-gray-900 mb-2">상담 신청 완료!</h4>
                  <p className="text-sm text-gray-500 mb-1">
                    <strong>{specialist.profiles?.full_name}</strong> {specialist.specialty_type}님께 상담 신청이 전송됐습니다.
                  </p>
                  <p className="text-xs text-gray-400 mb-6">전문가가 수락하면 알림이 발송됩니다.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowConsultModal(false)}
                      className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-2xl text-sm font-semibold hover:bg-gray-50 transition">
                      닫기
                    </button>
                    <Link href={`/${locale}/consultations`}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-2xl text-sm font-bold hover:bg-blue-700 transition text-center">
                      예약 현황 보기
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
