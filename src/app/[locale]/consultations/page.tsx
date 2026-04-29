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

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  accepted:  'bg-emerald-100 text-emerald-700',
  rejected:  'bg-red-100 text-red-600',
  completed: 'bg-gray-100 text-gray-600',
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
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payMessage, setPayMessage] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null)

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

        // 이미 결제된 상담 ID 조회
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
    setPayingId(consultation.id)
    setPayMessage(null)

    try {
      const response = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId,
        orderName: `요양보호사 상담 예약`,
        totalAmount: amount,
        currency: 'KRW',
        payMethod: 'CARD',
        alipayPlus: {},
      })

      if (response?.code) {
        // 사용자가 취소하거나 오류 발생
        if (response.code !== 'FAILURE_TYPE_PG') {
          setPayMessage({ id: consultation.id, type: 'error', text: t('payError') })
        }
        setPayingId(null)
        return
      }

      // 서버에서 결제 검증
      const verifyRes = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, consultationId: consultation.id, amount }),
      })

      if (verifyRes.ok) {
        setPaidIds(prev => new Set([...prev, consultation.id]))
        setPayMessage({ id: consultation.id, type: 'success', text: t('paySuccess') })
      } else {
        setPayMessage({ id: consultation.id, type: 'error', text: t('payError') })
      }
    } catch {
      setPayMessage({ id: consultation.id, type: 'error', text: t('payError') })
    }
    setPayingId(null)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}`} className="text-xl font-extrabold text-emerald-700">
            Care<span className="text-amber-400">Link</span>
          </Link>
          <Link href={`/${locale}/dashboard`} className="text-sm text-gray-500 hover:text-gray-700">
            {t('backToDashboard')}
          </Link>
        </div>
      </header>

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
                const isPayingThis = payingId === c.id
                const msg = payMessage?.id === c.id ? payMessage : null

                return (
                  <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">{name}</h3>
                        <p className="text-sm text-emerald-700">{licenseType}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[c.status]}`}>
                        {t(c.status)}
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
                          <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                            <span>✅</span>
                            <span>{t('paid')}</span>
                            <span className="ml-auto text-xs text-gray-400">{t('escrowNotice')}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm text-gray-600">{t('payAmount')}</span>
                              <span className="font-bold text-gray-900">
                                {amount.toLocaleString()}원
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mb-3">{t('escrowNotice')}</p>
                            <button
                              onClick={() => handlePayment(c)}
                              disabled={isPayingThis}
                              className="w-full bg-emerald-700 text-white py-3 rounded-xl text-sm
                                font-semibold hover:bg-emerald-800 transition disabled:opacity-50">
                              {isPayingThis ? t('paying') : t('payBtn')}
                            </button>
                          </>
                        )}
                        {msg && (
                          <p className={`text-xs mt-2 font-medium ${msg.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {msg.text}
                          </p>
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
                        {t(c.status)}
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
    </div>
  )
}
