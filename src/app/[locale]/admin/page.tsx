'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useLocale } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Tab = 'users' | 'caregivers' | 'reviews' | 'consultations'

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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ id: string; table: string; label: string } | null>(null)
  const [stats, setStats] = useState({ users: 0, caregivers: 0, reviews: 0, consultations: 0 })

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
    const tabs: Tab[] = ['users', 'caregivers', 'reviews', 'consultations']
    const results = await Promise.all(tabs.map(t =>
      fetch(`/api/admin?tab=${t}`).then(r => r.json())
    ))
    setStats({
      users: results[0].data?.length ?? 0,
      caregivers: results[1].data?.length ?? 0,
      reviews: results[2].data?.length ?? 0,
      consultations: results[3].data?.length ?? 0,
    })
  }, [])

  const loadTab = useCallback(async (t: Tab) => {
    setLoading(true)
    const res = await fetch(`/api/admin?tab=${t}`)
    const json = await res.json()
    setData(json.data ?? [])
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
    await fetch('/api/admin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: confirm.table, id: confirm.id }),
    })
    setConfirm(null)
    setDeletingId(null)
    loadTab(tab)
    loadStats()
  }

  if (authorized === null) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!authorized) return null

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'users',         label: '사용자',       count: stats.users },
    { key: 'caregivers',    label: '전문가 프로필', count: stats.caregivers },
    { key: 'reviews',       label: '리뷰',         count: stats.reviews },
    { key: 'consultations', label: '상담',          count: stats.consultations },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/${locale}`} className="text-xl font-extrabold text-emerald-700">
              Care<span className="text-amber-400">Link</span>
            </Link>
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
              관리자
            </span>
          </div>
          <Link href={`/${locale}/dashboard`} className="text-sm text-gray-500 hover:text-gray-700">
            대시보드로
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">관리자 페이지</h1>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '전체 사용자', value: stats.users, color: 'emerald' },
            { label: '전문가 프로필', value: stats.caregivers, color: 'blue' },
            { label: '전체 리뷰', value: stats.reviews, color: 'amber' },
            { label: '전체 상담', value: stats.consultations, color: 'purple' },
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
          ) : data.length === 0 ? (
            <div className="text-center py-16 text-gray-400">데이터가 없습니다</div>
          ) : (
            <div className="overflow-x-auto">
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
                          <button
                            onClick={() => setConfirm({ id: u.id, table: 'profiles', label: `${u.full_name || u.email} 사용자` })}
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

              {/* 전문가 프로필 탭 */}
              {tab === 'caregivers' && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">이름</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">자격증 종류</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">활동 지역</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">평점</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">상태</th>
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
                        <td className="px-5 py-4 text-gray-400">
                          {new Date(c.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setConfirm({ id: c.id, table: 'caregiver_profiles', label: `${(c.profiles as any)?.full_name ?? ''} 프로필` })}
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
                          {r.comment || <span className="text-gray-300">내용 없음</span>}
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
            </div>
          )}
        </div>
      </main>

      {/* 삭제 확인 모달 */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={() => !deletingId && setConfirm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">정말 삭제하시겠어요?</h3>
            <p className="text-sm text-gray-500 mb-6">
              <strong className="text-gray-800">{confirm.label}</strong>을(를) 삭제합니다.
              {confirm.table === 'profiles' && (
                <span className="block mt-1 text-red-500 text-xs">
                  회원 삭제 시 해당 계정의 모든 데이터가 함께 삭제됩니다.
                </span>
              )}
            </p>
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
