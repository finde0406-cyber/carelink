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
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: `reviews query: ${error.message}` }, { status: 500 })

    const reviews = data ?? []
    if (reviews.length === 0) return NextResponse.json({ data: [] })

    const reviewerIds = [...new Set(reviews.map((r: any) => r.reviewer_id).filter(Boolean))]
    const caregiverIds = [...new Set(reviews.map((r: any) => r.caregiver_id).filter(Boolean))]

    const reviewerMap: Record<string, string> = {}
    const cpMap: Record<string, string> = {}

    if (reviewerIds.length > 0) {
      const { data: rp, error: rpErr } = await admin.from('profiles').select('id, full_name').in('id', reviewerIds)
      if (rpErr) return NextResponse.json({ error: `profiles query: ${rpErr.message}` }, { status: 500 })
      ;(rp ?? []).forEach((p: any) => { reviewerMap[p.id] = p.full_name ?? '—' })
    }

    if (caregiverIds.length > 0) {
      const { data: cp, error: cpErr } = await admin.from('caregiver_profiles').select('id, profiles(full_name)').in('id', caregiverIds)
      if (cpErr) return NextResponse.json({ error: `caregiver_profiles query: ${cpErr.message}` }, { status: 500 })
      ;(cp ?? []).forEach((c: any) => { cpMap[c.id] = c.profiles?.full_name ?? '—' })
    }

    const result = reviews.map((r: any) => ({
      ...r,
      reviewer_name: reviewerMap[r.reviewer_id] ?? '—',
      caregiver_name: cpMap[r.caregiver_id] ?? '—',
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

  if (tab === 'specialists') {
    const { data, error } = await admin
      .from('specialist_profiles')
      .select('id, specialty_type, region, available, approved, avg_rating, review_count, created_at, profiles(full_name)')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  }

  if (tab === 'payments') {
    const { data, error } = await admin
      .from('payments')
      .select('*')
      .order('paid_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const payments = data ?? []
    if (payments.length === 0) return NextResponse.json({ data: [] })

    const userIds = [...new Set(payments.map((p: any) => p.user_id).filter(Boolean))]
    const userMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await admin.from('profiles').select('id, full_name').in('id', userIds)
      ;(profiles ?? []).forEach((p: any) => { userMap[p.id] = p.full_name ?? '—' })
    }

    const result = payments.map((p: any) => ({ ...p, user_name: userMap[p.user_id] ?? '—' }))
    return NextResponse.json({ data: result })
  }

  return NextResponse.json({ error: 'Invalid tab' }, { status: 400 })
}

// PATCH: 역할 변경 / 프로필 승인
export async function PATCH(req: NextRequest) {
  if (!await verifyAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const body = await req.json()
  const admin = adminClient()

  // 역할 변경
  if (body.action === 'role') {
    const { id, role } = body
    if (!id || !['family', 'caregiver', 'specialist'].includes(role)) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
    }
    const { error } = await admin.from('profiles').update({ role }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // 프로필 승인/거절
  if (body.action === 'approve') {
    const { id, approved, profileType = 'caregiver' } = body
    if (!id || typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
    }
    const table = profileType === 'specialist' ? 'specialist_profiles' : 'caregiver_profiles'
    const { error } = await admin.from(table).update({ approved }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 승인 시 이메일 발송
    if (approved) {
      const { data: cp } = await admin.from(table).select('user_id').eq('id', id).single()
      if (cp?.user_id) {
        const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
        const user = authUsers?.users?.find(u => u.id === cp.user_id)
        if (user?.email) {
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'profile_approved', email: user.email }),
          })
        }
      }
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

// DELETE: 레코드 삭제
export async function DELETE(req: NextRequest) {
  if (!await verifyAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { table, id } = await req.json()
  if (!table || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const allowed = ['profiles', 'caregiver_profiles', 'specialist_profiles', 'reviews', 'consultations']
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
