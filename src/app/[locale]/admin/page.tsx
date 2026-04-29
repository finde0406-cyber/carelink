'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Tab = 'users' | 'caregivers' | 'specialists' | 'reviews' | 'consultations' | 'payments'

const PAYMENT_STATUS_STYLE: Record<string, string> = {
  escrow:   'bg-amber-100 text-amber-700',
  settled:  'bg-emerald-100 text-emerald-700',
  refunded: 'bg-red-100 text-red-600',
}
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  escrow: '에스크로 보관중', settled: '정산완료', refunded: '환불',
}

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  accepted:  'bg-emerald-100 text-emerald-700',
  rejected:  'bg-red-100 text-red-600',
  completed: 'bg-gray-100 text-gray-600',
}
const STATUS_LABEL: Record<string, string> = {
  pending: '대기', accepted: '수락', rejected: '거절', completed: '완료',
}
const ROLE_LABEL: Record<string, string> = {
  family: '가족', caregiver: '요양보호사', specialist: '전문가',
}

export default function AdminPage() {
  const router = useRouter()
  const locale = useLocale()
  const supabase = createClient()

  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('users')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ id: string; table: string; label: string } | null>(null)
  const [stats, setStats] = useState({ users: 0, caregivers: 0, specialists: 0, reviews: 0, consultations: 0, payments: 0 })
  const [roleModal, setRoleModal] = useState<{ id: string; name: string; current: string } | null>(null)
  const [roleChanging, setRoleChanging] = useState(false)

  // 관리자 권한 확인
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === 'wldwm83@gmail.com') {
        setAuthorized(true)
      } else {
        setAuthorized(false)
        router.push(`/${locale}`)
      }
    })
  }, [])

  const loadStats = useCallback(async () => {
    const tabs: Tab[] = ['users', 'caregivers', 'specialists', 'reviews', 'consultations', 'payments']
    const results = await Promise.all(tabs.map(t =>
      fetch(`/api/admin?tab=${t}`).then(r => r.json())
    ))
    setStats({
      users: results[0].data?.length ?? 0,
      caregivers: results[1].data?.length ?? 0,
      specialists: results[2].data?.length ?? 0,
      reviews: results[3].data?.length ?? 0,
      consultations: results[4].data?.length ?? 0,
      payments: results[5].data?.length ?? 0,
    })
  }, [])

  async function handleRoleChange(id: string, role: string) {
    setRoleChanging(true)
    const res = await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'role', id, role }),
    })
    setRoleChanging(false)
    if (res.ok) { setRoleModal(null); loadTab(tab) }
  }

  async function handleApprove(id: string, approved: boolean, profileType: 'caregiver' | 'specialist' = 'caregiver') {
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', id, approved, profileType }),
    })
    loadTab(tab)
    loadStats()
  }

  const loadTab = useCallback(async (t: Tab) => {
    setLoading(true)
    setApiError(null)
    try {
      const res = await fetch(`/api/admin?tab=${t}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `서버 오류 (${res.status})`)
      setData(json.data ?? [])
    } catch (e: any) {
      setApiError(e.message ?? '데이터를 불러오지 못했습니다.')
      setData([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!authorized) return
    loadStats()
    loadTab(tab)
  }, [authorized, tab])

  async function handleDelete() {
    if (!confirm) return
    setDeletingId(confirm.id)
    setDeleteError(null)
    try {
      const res = await fetch('/api/admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: confirm.table, id: confirm.id }),
      })
      if (!res.ok) throw new Error('삭제 중 오류가 발생했습니다.')
      setConfirm(null)
      loadTab(tab)
      loadStats()
    } catch (e: any) {
      setDeleteError(e.message ?? '삭제 중 오류가 발생했습니다.')
    }
    setDeletingId(null)
  }

  if (authorized === null) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!authorized) return null

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'users',         label: '사용자',           count: stats.users },
    { key: 'caregivers',    label: '요양보호사 프로필', count: stats.caregivers },
    { key: 'specialists',   label: '전문가 프로필',     count: stats.specialists },
    { key: 'reviews',       label: '리뷰',             count: stats.reviews },
    { key: 'consultations', label: '상담',              count: stats.consultations },
    { key: 'payments',      label: '결제',              count: stats.payments },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pt-16">

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">관리자 페이지</h1>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: '전체 사용자', value: stats.users },
            { label: '요양보호사', value: stats.caregivers },
            { label: '법률·세무 전문가', value: stats.specialists },
            { label: '전체 리뷰', value: stats.reviews },
            { label: '전체 상담', value: stats.consultations },
            { label: '결제 건수', value: stats.payments },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-5 text-center">
              <div className="text-3xl font-extrabold text-gray-900">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5
                ${tab === t.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                ${tab === t.key ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* 테이블 */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : apiError ? (
            <div className="text-center py-16">
              <p className="text-red-500 text-sm font-medium">{apiError}</p>
              <button onClick={() => loadTab(tab)}
                className="mt-3 text-emerald-600 text-sm font-semibold hover:underline">
                다시 시도
              </button>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-16 text-gray-400">데이터가 없습니다</div>
          ) : (
            <>
            {/* 모바일 카드 뷰 (md 미만) */}
            <div className="md:hidden divide-y divide-gray-50">
              {data.map((item: any) => (
                <div key={item.id} className="px-5 py-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    {tab === 'users' && <>
                      <p className="font-semibold text-gray-900 text-sm truncate">{item.full_name || '—'}</p>
                      <p className="text-xs text-gray-400 truncate">{item.email}</p>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold
                        ${item.role === 'caregiver' ? 'bg-emerald-100 text-emerald-700'
                        : item.role === 'specialist' ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABEL[item.role] ?? item.role}
                      </span>
                    </>}
                    {tab === 'caregivers' && <>
                      <p className="font-semibold text-gray-900 text-sm">{(item.profiles as any)?.full_name || '—'}</p>
                      <p className="text-xs text-gray-500">{item.license_type} · {item.region}</p>
                      <p className="text-xs text-amber-500 font-semibold">★ {(item.avg_rating ?? 0).toFixed(1)} ({item.review_count ?? 0}개)</p>
                    </>}
                    {tab === 'reviews' && <>
                      <p className="font-semibold text-gray-900 text-sm">{item.reviewer_name} → {item.caregiver_name}</p>
                      <p className="text-xs text-amber-500">{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</p>
                      {item.content && <p className="text-xs text-gray-500 line-clamp-2">{item.content}</p>}
                    </>}
                    {tab === 'consultations' && <>
                      <p className="font-semibold text-gray-900 text-sm">{item.family_name} → {item.caregiver_name}</p>
                      <p className="text-xs text-gray-500">{item.requested_date} {item.requested_time}</p>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[item.status]}`}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    </>}
                    {tab === 'payments' && <>
                      <p className="font-semibold text-gray-900 text-sm">{item.user_name}</p>
                      <p className="text-xs font-semibold text-gray-700">₩{(item.amount ?? 0).toLocaleString()}</p>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${PAYMENT_STATUS_STYLE[item.status] ?? ''}`}>
                        {PAYMENT_STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    </>}
                  </div>
                  {tab === 'users' ? (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => setRoleModal({ id: item.id, name: item.full_name || item.email, current: item.role })}
                        className="text-xs text-blue-600 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition">
                        역할 변경
                      </button>
                      <button
                        onClick={() => setConfirm({ id: item.id, table: 'profiles', label: item.full_name || item.email })}
                        className="text-xs text-red-500 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition">
                        삭제
                      </button>
                    </div>
                  ) : tab !== 'payments' && (
                    <button
                      onClick={() => setConfirm({
                        id: item.id,
                        table: tab === 'caregivers' ? 'caregiver_profiles' : tab,
                        label: tab === 'caregivers' ? ((item.profiles as any)?.full_name ?? '') + ' 프로필'
                             : tab === 'reviews' ? item.reviewer_name + '의 리뷰'
                             : item.family_name + ' 상담',
                      })}
                      className="shrink-0 text-xs text-red-500 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition">
                      삭제
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* 데스크탑 테이블 뷰 (md 이상) */}
            <div className="hidden md:block overflow-x-auto">
              {/* 사용자 탭 */}
              {tab === 'users' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">이름</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">이메일</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">역할</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">가입일</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4 font-medium text-gray-900">{u.full_name || '—'}</td>
                        <td className="px-5 py-4 text-gray-500">{u.email || '—'}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                            ${u.role === 'caregiver' ? 'bg-emerald-100 text-emerald-700'
                            : u.role === 'specialist' ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'}`}>
                            {ROLE_LABEL[u.role] ?? u.role}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-400">
                          {new Date(u.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setRoleModal({ id: u.id, name: u.full_name || u.email, current: u.role })}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5
                                border border-blue-200 rounded-lg hover:bg-blue-50 transition">
                              역할 변경
                            </button>
                            <button
                              onClick={() => setConfirm({ id: u.id, table: 'profiles', label: `${u.full_name || u.email} 사용자` })}
                              className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5
                                border border-red-200 rounded-lg hover:bg-red-50 transition">
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 전문가 프로필 탭 */}
              {tab === 'caregivers' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">이름</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">자격증 종류</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">활동 지역</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">평점</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">활동</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">승인</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">등록일</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4 font-medium text-gray-900">
                          {(c.profiles as any)?.full_name || '—'}
                        </td>
                        <td className="px-5 py-4 text-gray-500">{c.license_type}</td>
                        <td className="px-5 py-4 text-gray-500">{c.region}</td>
                        <td className="px-5 py-4 text-amber-500 font-semibold">
                          ★ {(c.avg_rating ?? 0).toFixed(1)}
                          <span className="text-gray-400 font-normal ml-1">({c.review_count ?? 0})</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                            ${c.available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {c.available ? '활동중' : '비활성'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                            ${c.approved ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {c.approved ? '승인됨' : '대기중'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-400">
                          {new Date(c.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(c.id, !c.approved)}
                              className={`text-xs font-medium px-3 py-1.5 border rounded-lg transition
                                ${c.approved
                                  ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                                  : 'text-blue-600 border-blue-200 hover:bg-blue-50'}`}>
                              {c.approved ? '승인 취소' : '승인'}
                            </button>
                            <button
                              onClick={() => setConfirm({ id: c.id, table: 'caregiver_profiles', label: `${(c.profiles as any)?.full_name ?? ''} 프로필` })}
                              className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5
                                border border-red-200 rounded-lg hover:bg-red-50 transition">
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 법률·세무 전문가 프로필 탭 */}
              {tab === 'specialists' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">이름</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">전문가 유형</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">활동 지역</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">평점</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">활동</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">승인</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">등록일</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4 font-medium text-gray-900">{(c.profiles as any)?.full_name || '—'}</td>
                        <td className="px-5 py-4 text-gray-500">{c.specialty_type}</td>
                        <td className="px-5 py-4 text-gray-500">{c.region}</td>
                        <td className="px-5 py-4 text-amber-500 font-semibold">
                          ★ {(c.avg_rating ?? 0).toFixed(1)}
                          <span className="text-gray-400 font-normal ml-1">({c.review_count ?? 0})</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                            ${c.available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {c.available ? '활동중' : '비활성'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                            ${c.approved ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {c.approved ? '승인됨' : '대기중'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-400">
                          {new Date(c.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(c.id, !c.approved, 'specialist')}
                              className={`text-xs font-medium px-3 py-1.5 border rounded-lg transition
                                ${c.approved ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-blue-600 border-blue-200 hover:bg-blue-50'}`}>
                              {c.approved ? '승인 취소' : '승인'}
                            </button>
                            <button
                              onClick={() => setConfirm({ id: c.id, table: 'specialist_profiles', label: `${(c.profiles as any)?.full_name ?? ''} 프로필` })}
                              className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition">
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 리뷰 탭 */}
              {tab === 'reviews' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">작성자</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">전문가</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">평점</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">내용</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">작성일</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4 font-medium text-gray-900">{r.reviewer_name}</td>
                        <td className="px-5 py-4 text-gray-500">{r.caregiver_name}</td>
                        <td className="px-5 py-4">
                          <span className="text-amber-500 font-semibold">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                        </td>
                        <td className="px-5 py-4 text-gray-500 max-w-xs truncate">
                          {r.content || <span className="text-gray-300">내용 없음</span>}
                        </td>
                        <td className="px-5 py-4 text-gray-400">
                          {new Date(r.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setConfirm({ id: r.id, table: 'reviews', label: `${r.reviewer_name}의 리뷰` })}
                            className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5
                              border border-red-200 rounded-lg hover:bg-red-50 transition">
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 상담 탭 */}
              {tab === 'consultations' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">가족</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">전문가</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">희망 일시</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">상태</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">신청일</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4 font-medium text-gray-900">{c.family_name}</td>
                        <td className="px-5 py-4 text-gray-500">{c.caregiver_name}</td>
                        <td className="px-5 py-4 text-gray-500">{c.requested_date} {c.requested_time}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[c.status]}`}>
                            {STATUS_LABEL[c.status] ?? c.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-400">
                          {new Date(c.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setConfirm({ id: c.id, table: 'consultations', label: `${c.family_name} → ${c.caregiver_name} 상담` })}
                            className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5
                              border border-red-200 rounded-lg hover:bg-red-50 transition">
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {/* 결제 탭 */}
              {tab === 'payments' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">사용자</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">결제금액</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">상태</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">결제일시</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">정산예정</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4 font-medium text-gray-900">{p.user_name}</td>
                        <td className="px-5 py-4 font-semibold text-gray-900">
                          ₩{(p.amount ?? 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                            ${PAYMENT_STATUS_STYLE[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-400">
                          {p.paid_at ? new Date(p.paid_at).toLocaleString('ko-KR') : '—'}
                        </td>
                        <td className="px-5 py-4 text-gray-400">
                          {p.settle_after ? new Date(p.settle_after).toLocaleString('ko-KR') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            </>
          )}
        </div>
      </main>

      {/* 역할 변경 모달 */}
      {roleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={() => !roleChanging && setRoleModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">역할 변경</h3>
            <p className="text-sm text-gray-500 mb-5">
              <strong className="text-gray-800">{roleModal.name}</strong>의 역할을 변경합니다.
            </p>
            <div className="flex flex-col gap-2 mb-6">
              {(['family', 'caregiver', 'specialist'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => handleRoleChange(roleModal.id, r)}
                  disabled={roleChanging || r === roleModal.current}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition
                    ${r === roleModal.current
                      ? 'bg-emerald-700 text-white cursor-default'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50'}`}>
                  {ROLE_LABEL[r]}
                  {r === roleModal.current && ' (현재)'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setRoleModal(null)}
              disabled={roleChanging}
              className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={() => !deletingId && setConfirm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">정말 삭제하시겠어요?</h3>
            <p className="text-sm text-gray-500 mb-4">
              <strong className="text-gray-800">{confirm.label}</strong>을(를) 삭제합니다.
              {confirm.table === 'profiles' && (
                <span className="block mt-1 text-red-500 text-xs">
                  회원 삭제 시 해당 계정의 모든 데이터가 함께 삭제됩니다.
                </span>
              )}
            </p>
            {deleteError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                disabled={!!deletingId}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm
                  font-semibold hover:bg-gray-50 transition disabled:opacity-50">
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={!!deletingId}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm
                  font-semibold hover:bg-red-600 transition disabled:opacity-50">
                {deletingId ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
