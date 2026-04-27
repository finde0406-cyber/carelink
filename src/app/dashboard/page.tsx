import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const roleLabel = profile?.role === 'caregiver' ? '요양보호사'
    : profile?.role === 'specialist' ? '전문가' : '가족/보호자'

  async function handleLogout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-extrabold text-emerald-700">
            Care<span className="text-amber-400">Link</span>
          </Link>
          <form action={handleLogout}>
            <button className="text-sm text-gray-500 hover:text-gray-700">로그아웃</button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Welcome */}
        <div className="bg-emerald-700 text-white rounded-2xl p-8 mb-8">
          <p className="text-emerald-200 text-sm font-medium mb-1">{roleLabel}</p>
          <h1 className="text-2xl font-extrabold">
            안녕하세요, {profile?.full_name || '회원'}님! 👋
          </h1>
          <p className="text-emerald-200 mt-2 text-sm">CareLink에 오신 것을 환영합니다.</p>
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 gap-4">
          {profile?.role === 'family' && (
            <>
              <Link href="/search"
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition hover:-translate-y-0.5">
                <div className="text-3xl mb-3">🔍</div>
                <h3 className="font-bold text-gray-900 mb-1">요양보호사 찾기</h3>
                <p className="text-sm text-gray-500">지역별 요양보호사를 검색하세요</p>
              </Link>
              <div className="bg-white border border-gray-200 rounded-2xl p-6 opacity-60">
                <div className="text-3xl mb-3">📜</div>
                <h3 className="font-bold text-gray-900 mb-1">상속 전문가 찾기</h3>
                <p className="text-sm text-gray-500">준비 중입니다</p>
              </div>
            </>
          )}

          {profile?.role === 'caregiver' && (
            <>
              <Link href="/caregivers/profile"
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition hover:-translate-y-0.5">
                <div className="text-3xl mb-3">👤</div>
                <h3 className="font-bold text-gray-900 mb-1">프로필 등록/수정</h3>
                <p className="text-sm text-gray-500">나의 자격증과 경력을 등록하세요</p>
              </Link>
              <div className="bg-white border border-gray-200 rounded-2xl p-6 opacity-60">
                <div className="text-3xl mb-3">📅</div>
                <h3 className="font-bold text-gray-900 mb-1">예약 관리</h3>
                <p className="text-sm text-gray-500">준비 중입니다</p>
              </div>
            </>
          )}

          {profile?.role === 'specialist' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 opacity-60">
              <div className="text-3xl mb-3">📋</div>
              <h3 className="font-bold text-gray-900 mb-1">전문가 기능</h3>
              <p className="text-sm text-gray-500">준비 중입니다</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
