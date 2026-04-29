'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import * as PortOne from '@portone/browser-sdk/v2'

interface ConsultationFamily {
  id: string
  family_id: string
  caregiver_id: string
  requested_date: string
  requested_time: string
  notes: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'completed'
  caregiver_reply: string | null
  created_at: string
  caregiver_profiles: {
    id: string
    license_type: string
    hourly_rate: number
    profiles: { full_name: string; avatar_url: string | null } | null
  } | null
}

interface ConsultationCaregiver {
  id: string
  family_id: string
  caregiver_id: string
  requested_date: string
  requested_time: string
  notes: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'completed'
  caregiver_reply: string | null
  created_at: string
  profiles: { full_name: string; avatar_url: string | null } | null
}

type PayModalState = {
  consultation: ConsultationFamily
  step: 'confirm' | 'processing' | 'done' | 'error'
  errorMsg?: string
} | null

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  accepted:  'bg-emerald-100 text-emerald-700',
  rejected:  'bg-red-100 text-red-600',
  completed: 'bg-gray-100 text-gray-600',
}

const STATUS_LABEL: Record<string, string> = {
  pending:   '대기 중',
  accepted:  '수락됨',
  rejected:  '거절됨',
  completed: '완료',
}

export default function ConsultationsPage() {
  const t = useTranslations('consultation')
  const locale = useLocale()
  const router = useRouter()
  const supabase = createClient()

  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [familyList, setFamilyList] = useState<ConsultationFamily[]>([])
  const [caregiverList, setCaregiverList] = useState<ConsultationCaregiver[]>([])
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set())
  const [payModal, setPayModal] = useState<PayModalState>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push(`/${locale}/auth/login`); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const userRole = profileData?.role
      setRole(userRole)

      if (userRole === 'family') {
        const { data } = await supabase
          .from('consultations')
          .select('*, caregiver_profiles(id, license_type, hourly_rate, profiles(full_name, avatar_url))')
          .eq('family_id', user.id)
          .order('created_at', { ascending: false })
        const list = (data as ConsultationFamily[]) || []
        setFamilyList(list)

        if (list.length > 0) {
          const ids = list.map(c => c.id)
          const { data: payData } = await supabase
            .from('payments')
            .select('consultation_id')
            .in('consultation_id', ids)
          if (payData) {
            setPaidIds(new Set(payData.map((p: { consultation_id: string }) => p.consultation_id)))
          }
        }

      } else if (userRole === 'caregiver') {
        const { data: cp } = await supabase
          .from('caregiver_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (cp) {
          const { data } = await supabase
            .from('consultations')
            .select('*, profiles!family_id(full_name, avatar_url)')
            .eq('caregiver_id', cp.id)
            .order('created_at', { ascending: false })
          const list = (data as ConsultationCaregiver[]) || []
          setCaregiverList(list)
          const texts: Record<string, string> = {}
          list.forEach(c => { if (c.caregiver_reply) texts[c.id] = c.caregiver_reply })
          setReplyTexts(texts)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  async function updateStatus(id: string, status: 'accepted' | 'rejected') {
    setActionLoading(id)
    await supabase.from('consultations').update({ status }).eq('id', id)
    setCaregiverList(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    setActionLoading(null)
    fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: status, consultationId: id }),
    }).catch(() => {})
  }

  async function saveReply(id: string) {
    const key = id + '-reply'
    setActionLoading(key)
    const reply = replyTexts[id] || ''
    await supabase.from('consultations').update({ caregiver_reply: reply }).eq('id', id)
    setCaregiverList(prev => prev.map(c => c.id === id ? { ...c, caregiver_reply: reply } : c))
    setActionLoading(null)
  }

  async function handlePayment(consultation: ConsultationFamily) {
    const amount = consultation.caregiver_profiles?.hourly_rate || 10000
    const paymentId = `carelink-${consultation.id}-${Date.now()}`

    setPayModal({ consultation, step: 'processing' })

    try {
      const response = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId,
        orderName: '요양보호사 상담 예약',
        totalAmount: amount,
        currency: 'KRW',
        payMethod: 'CARD',
        alipayPlus: {},
      })

      if (response?.code) {
        setPayModal({ consultation, step: 'error', errorMsg: '결제가 취소됐습니다.' })
        return
      }

      const verifyRes = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, consultationId: consultation.id, amount }),
      })

      if (verifyRes.ok) {
        setPaidIds(prev => new Set([...prev, consultation.id]))
        setPayModal({ consultation, step: 'done' })
      } else {
        setPayModal({ consultation, step: 'error', errorMsg: '결제 검증에 실패했습니다. 고객센터에 문의해 주세요.' })
      }
    } catch {
      setPayModal({ consultation, step: 'error', errorMsg: '결제 처리 중 오류가 발생했습니다.' })
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pt-16">

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-8">
          {role === 'caregiver' ? t('incomingTitle') : t('listTitle')}
        </h1>

        {/* 가족 보기 */}
        {role === 'family' && (
          <div className="space-y-4">
            {familyList.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-gray-500 mb-6">{t('emptyFamily')}</p>
                <Link href={`/${locale}/search`}
                  className="bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold text-sm
                    hover:bg-emerald-800 transition">
                  요양보호사 찾기 →
                </Link>
              </div>
            ) : (
              familyList.map(c => {
                const name = c.caregiver_profiles?.profiles?.full_name || '—'
                const licenseType = c.caregiver_profiles?.license_type || ''
                const caregiverId = c.caregiver_profiles?.id
                const amount = c.caregiver_profiles?.hourly_rate || 10000
                const isPaid = paidIds.has(c.id)

                return (
                  <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">{name}</h3>
                        <p className="text-sm text-emerald-700">{licenseType}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1.5 mb-4">
                      <p>
                        <span className="font-medium text-gray-700">{t('dateTimeLabel')}: </span>
                        {c.requested_date} {c.requested_time}
                      </p>
                      {c.notes && (
                        <p>
                          <span className="font-medium text-gray-700">{t('notesDisplayLabel')}: </span>
                          {c.notes}
                        </p>
                      )}
                    </div>

                    {c.caregiver_reply && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-4">
                        <p className="text-xs font-semibold text-emerald-700 mb-1">{t('replyLabel')}</p>
                        <p className="text-sm text-gray-700">{c.caregiver_reply}</p>
                      </div>
                    )}

                    {/* 결제 영역 */}
                    {c.status === 'accepted' && (
                      <div className="border-t border-gray-100 pt-4 mt-2">
                        {isPaid ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                                <path d="M1 5l4 4 6-8" stroke="#059669" strokeWidth="1.8"
                                  strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            <span className="text-sm font-semibold text-emerald-700">결제 완료</span>
                            <span className="ml-auto text-xs text-gray-400">서비스 완료 후 48시간 내 자동 정산</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPayModal({ consultation: c, step: 'confirm' })}
                            className="w-full flex items-center justify-between bg-emerald-600 hover:bg-emerald-700
                              text-white px-5 py-3.5 rounded-2xl transition active:scale-[0.98]">
                            <div className="text-left">
                              <p className="text-xs text-emerald-200 mb-0.5">결제하기</p>
                              <p className="font-bold text-base">{amount.toLocaleString()}원</p>
                            </div>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                              <path d="M7 4l6 6-6 6" stroke="white" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    )}

                    {caregiverId && (
                      <div className="mt-4">
                        <Link href={`/${locale}/caregivers/${caregiverId}`}
                          className="text-sm text-emerald-700 font-semibold hover:underline">
                          {t('viewCaregiver')} →
                        </Link>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* 요양보호사 보기 */}
        {role === 'caregiver' && (
          <div className="space-y-4">
            {caregiverList.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📭</div>
                <p className="text-gray-500">{t('emptyCaregiver')}</p>
              </div>
            ) : (
              caregiverList.map(c => {
                const familyName = (c.profiles as { full_name?: string } | null)?.full_name || '—'
                return (
                  <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">{familyName}</h3>
                        <p className="text-sm text-gray-500">{t('familyLabel')}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1.5 mb-4">
                      <p>
                        <span className="font-medium text-gray-700">{t('dateTimeLabel')}: </span>
                        {c.requested_date} {c.requested_time}
                      </p>
                      {c.notes && (
                        <p>
                          <span className="font-medium text-gray-700">{t('notesDisplayLabel')}: </span>
                          {c.notes}
                        </p>
                      )}
                    </div>

                    {c.status === 'pending' && (
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => updateStatus(c.id, 'accepted')}
                          disabled={actionLoading === c.id}
                          className="flex-1 bg-emerald-700 text-white py-2.5 rounded-xl text-sm
                            font-semibold hover:bg-emerald-800 transition disabled:opacity-50">
                          {actionLoading === c.id ? '...' : t('accept')}
                        </button>
                        <button
                          onClick={() => updateStatus(c.id, 'rejected')}
                          disabled={actionLoading === c.id}
                          className="flex-1 border border-red-400 text-red-600 py-2.5 rounded-xl
                            text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50">
                          {actionLoading === c.id ? '...' : t('reject')}
                        </button>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        {t('replyLabel')}
                      </label>
                      <textarea
                        value={replyTexts[c.id] || ''}
                        onChange={e => setReplyTexts(prev => ({ ...prev, [c.id]: e.target.value }))}
                        placeholder={t('replyPlaceholder')}
                        rows={2}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none
                          focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition
                          resize-none mb-2 bg-white"
                      />
                      <button
                        onClick={() => saveReply(c.id)}
                        disabled={actionLoading === c.id + '-reply'}
                        className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-medium
                          hover:bg-gray-200 transition disabled:opacity-50">
                        {actionLoading === c.id + '-reply' ? '...' : t('replySubmit')}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </main>

      {/* 결제 모달 */}
      {payModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => payModal.step !== 'processing' && setPayModal(null)}>
          <div
            className="modal-enter bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>

            {/* 확인 단계 */}
            {payModal.step === 'confirm' && (
              <div className="step-fwd">
                <div className="h-1 bg-emerald-500" />
                <div className="px-6 pt-6 pb-7">
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-xs font-bold text-emerald-600 tracking-wide uppercase">결제 확인</p>
                    <button
                      onClick={() => setPayModal(null)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center
                        justify-center text-gray-500 text-sm transition">
                      ✕
                    </button>
                  </div>

                  <h3 className="text-xl font-extrabold text-gray-900 mb-1">안전하게 결제해 드릴게요</h3>
                  <p className="text-sm text-gray-400 mb-5">서비스 완료 후 48시간 뒤에 요양보호사에게 전달됩니다</p>

                  {/* 결제 정보 카드 */}
                  <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">서비스</span>
                      <span className="text-sm font-semibold text-gray-900">요양보호사 상담 예약</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">일시</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {payModal.consultation.requested_date} {payModal.consultation.requested_time}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-900">결제 금액</span>
                      <span className="text-xl font-extrabold text-emerald-700">
                        {(payModal.consultation.caregiver_profiles?.hourly_rate || 10000).toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-5">
                    <span className="text-base mt-0.5 shrink-0">🔒</span>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      결제 금액은 에스크로로 안전하게 보관됩니다. 서비스 완료 확인 후 자동 정산됩니다.
                    </p>
                  </div>

                  <button
                    onClick={() => handlePayment(payModal.consultation)}
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base
                      hover:bg-emerald-700 active:scale-[0.98] transition">
                    카드로 결제하기
                  </button>
                </div>
              </div>
            )}

            {/* 처리 중 */}
            {payModal.step === 'processing' && (
              <div className="fade-up px-6 py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">결제 처리 중...</h3>
                <p className="text-sm text-gray-400">잠시만 기다려 주세요</p>
              </div>
            )}

            {/* 완료 */}
            {payModal.step === 'done' && (
              <div className="fade-up px-6 py-10 text-center">
                <div className="pop-in mx-auto w-fit mb-5">
                  <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                    <circle cx="36" cy="36" r="33" stroke="#10b981" strokeWidth="3"
                      strokeDasharray="208" className="ring-draw" />
                    <path d="M22 36l11 11 17-20" stroke="#10b981" strokeWidth="3.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      strokeDasharray="52" className="check-draw" fill="none"/>
                  </svg>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-2">결제 완료!</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  결제가 안전하게 처리됐습니다.<br/>
                  서비스 완료 후 48시간 내 자동으로 정산돼요.
                </p>
                <button
                  onClick={() => setPayModal(null)}
                  className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold text-sm
                    hover:bg-emerald-700 active:scale-[0.98] transition">
                  확인
                </button>
              </div>
            )}

            {/* 오류 */}
            {payModal.step === 'error' && (
              <div className="fade-up px-6 py-10 text-center">
                <div className="pop-in mx-auto w-fit mb-5">
                  <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                    <circle cx="36" cy="36" r="33" stroke="#f87171" strokeWidth="3"
                      strokeDasharray="208" className="ring-draw" />
                    <path d="M26 26l20 20M46 26L26 46" stroke="#f87171" strokeWidth="3.5"
                      strokeLinecap="round" className="check-draw"/>
                  </svg>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-2">결제에 실패했어요</h3>
                <p className="text-sm text-gray-500 mb-6">{payModal.errorMsg || '다시 시도해 주세요.'}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPayModal(null)}
                    className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition">
                    닫기
                  </button>
                  <button
                    onClick={() => setPayModal({ ...payModal, step: 'confirm' })}
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-semibold text-sm hover:bg-emerald-700 transition">
                    다시 시도
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
