import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'wldwm83@gmail.com'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

// GET: 데이터 조회
export async function GET(req: NextRequest) {
  if (!await verifyAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const tab = req.nextUrl.searchParams.get('tab') ?? 'users'
  const admin = adminClient()

  if (tab === 'users') {
    const { data, error } = await admin
      .from('profiles')
      .select('id, full_name, role, created_at')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // 이메일은 auth.users 에서 별도 조회
    const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const emailMap: Record<string, string> = {}
    authUsers?.users?.forEach(u => { emailMap[u.id] = u.email ?? '' })
    const result = (data ?? []).map(p => ({ ...p, email: emailMap[p.id] ?? '' }))
    return NextResponse.json({ data: result })
  }

  if (tab === 'caregivers') {
    const { data, error } = await admin
      .from('caregiver_profiles')
      .select('id, license_type, region, available, avg_rating, review_count, created_at, profiles(full_name)')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  }

  if (tab === 'reviews') {
    const { data, error } = await admin
      .from('reviews')
      .select('id, rating, comment, created_at, caregiver_id, reviewer_id, profiles!reviewer_id(full_name)')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // 요양보호사 이름 조회
    const caregiverIds = [...new Set((data ?? []).map((r: any) => r.caregiver_id))]
    const { data: cpData } = await admin
      .from('caregiver_profiles')
      .select('id, profiles(full_name)')
      .in('id', caregiverIds)
    const cpMap: Record<string, string> = {}
    ;(cpData ?? []).forEach((cp: any) => { cpMap[cp.id] = cp.profiles?.full_name ?? '—' })
    const result = (data ?? []).map((r: any) => ({
      ...r,
      caregiver_name: cpMap[r.caregiver_id] ?? '—',
      reviewer_name: (r.profiles as any)?.full_name ?? '—',
    }))
    return NextResponse.json({ data: result })
  }

  if (tab === 'consultations') {
    const { data, error } = await admin
      .from('consultations')
      .select(`
        id, requested_date, requested_time, status, created_at,
        caregiver_profiles!caregiver_id(profiles(full_name)),
        profiles!family_id(full_name)
      `)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const result = (data ?? []).map((c: any) => ({
      ...c,
      caregiver_name: c.caregiver_profiles?.profiles?.full_name ?? '—',
      family_name: c.profiles?.full_name ?? '—',
    }))
    return NextResponse.json({ data: result })
  }

  return NextResponse.json({ error: 'Invalid tab' }, { status: 400 })
}

// DELETE: 레코드 삭제
export async function DELETE(req: NextRequest) {
  if (!await verifyAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { table, id } = await req.json()
  if (!table || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const allowed = ['profiles', 'caregiver_profiles', 'reviews', 'consultations']
  if (!allowed.includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }

  const admin = adminClient()

  // 회원 삭제 시 auth.users 도 삭제
  if (table === 'profiles') {
    await admin.auth.admin.deleteUser(id)
  }

  const { error } = await admin.from(table).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
