import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'CareLink <noreply@carelink.app>'
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// 공통 이메일 레이아웃
function layout(title: string, body: string) {
  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
    <!-- 헤더 -->
    <div style="background:#065f46;padding:24px 32px">
      <span style="font-size:22px;font-weight:900;color:#fff">Care<span style="color:#fbbf24">Link</span></span>
    </div>
    <!-- 본문 -->
    <div style="padding:32px">
      <h2 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 16px">${title}</h2>
      ${body}
    </div>
    <!-- 푸터 -->
    <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
      <p style="font-size:12px;color:#9ca3af;margin:0">
        © 2025 CareLink · <a href="${BASE_URL}/ko/privacy" style="color:#9ca3af">개인정보처리방침</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;font-size:13px;color:#6b7280;width:110px">${label}</td>
    <td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600">${value}</td>
  </tr>`
}

function ctaButton(href: string, text: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;background:#065f46;color:#fff;
    font-size:14px;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none">${text}</a>`
}

// ─── 핸들러 ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { type, consultationId, email } = await req.json()

  if (!type) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const admin = adminClient()

  // ── 프로필 승인 알림 ─────────────────────────────────────────────────────────
  if (type === 'profile_approved') {
    if (!email) return NextResponse.json({ ok: true, skipped: 'no email' })
    try {
      const body = `
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px">
          축하합니다! 프로필 검토가 완료됐습니다. 🎉<br/>
          이제 CareLink 검색에 노출되며 상담 예약을 받을 수 있습니다.
        </p>
        ${ctaButton(`${BASE_URL}/ko/dashboard`, '대시보드 바로가기 →')}
      `
      await resend.emails.send({
        from: FROM,
        to: email,
        subject: '[CareLink] 프로필이 승인됐습니다 🎉',
        html: layout('프로필 승인 완료', body),
      })
    } catch {}
    return NextResponse.json({ ok: true })
  }

  if (!consultationId) {
    return NextResponse.json({ error: 'Missing consultationId' }, { status: 400 })
  }

  // 예약 + 관련 정보 조회
  const { data: consult, error: cErr } = await admin
    .from('consultations')
    .select(`
      id, requested_date, requested_time, notes, status, caregiver_reply,
      caregiver_profiles!caregiver_id(
        user_id,
        profiles(full_name)
      ),
      family:profiles!family_id(full_name)
    `)
    .eq('id', consultationId)
    .single()

  if (cErr || !consult) {
    return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
  }

  const cp = (consult as any).caregiver_profiles
  const caregiverUserId: string = cp?.user_id
  const caregiverName: string = cp?.profiles?.full_name ?? '전문가'
  const familyName: string = (consult as any).family?.full_name ?? '가족'
  const date: string = consult.requested_date
  const time: string = consult.requested_time
  const notes: string = consult.notes ?? '없음'
  const reply: string = consult.caregiver_reply ?? ''
  const dashUrl = `${BASE_URL}/ko/consultations`

  try {
    // ── 1. 새 예약 요청 → 요양보호사에게 알림 ────────────────────────────────
    if (type === 'new_request') {
      const { data: caregiverUser } = await admin.auth.admin.getUserById(caregiverUserId)
      const caregiverEmail = caregiverUser?.user?.email
      if (!caregiverEmail) return NextResponse.json({ ok: true, skipped: 'no email' })

      const body = `
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px">
          <strong>${familyName}</strong> 님이 상담 예약을 요청했습니다.
        </p>
        <table style="width:100%;border-collapse:collapse">
          ${infoRow('날짜', date)}
          ${infoRow('시간', time)}
          ${infoRow('요청자', familyName)}
          ${infoRow('메모', notes)}
        </table>
        ${ctaButton(dashUrl, '예약 요청 확인하기 →')}
      `
      await resend.emails.send({
        from: FROM,
        to: caregiverEmail,
        subject: `[CareLink] ${familyName} 님이 상담을 요청했습니다`,
        html: layout('새 상담 예약 요청', body),
      })
    }

    // ── 2. 수락 → 가족에게 알림 ───────────────────────────────────────────────
    else if (type === 'accepted') {
      const { data: familyConsult } = await admin
        .from('consultations')
        .select('family_id')
        .eq('id', consultationId)
        .single()
      const { data: familyUser } = await admin.auth.admin.getUserById((familyConsult as any)?.family_id)
      const familyEmail = familyUser?.user?.email
      if (!familyEmail) return NextResponse.json({ ok: true, skipped: 'no email' })

      const body = `
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px">
          <strong>${caregiverName}</strong> 님이 상담 예약을 수락했습니다! 🎉
        </p>
        <table style="width:100%;border-collapse:collapse">
          ${infoRow('날짜', date)}
          ${infoRow('시간', time)}
          ${infoRow('담당 전문가', caregiverName)}
          ${reply ? infoRow('전문가 메모', reply) : ''}
        </table>
        ${ctaButton(dashUrl, '예약 현황 보기 →')}
      `
      await resend.emails.send({
        from: FROM,
        to: familyEmail,
        subject: `[CareLink] 상담 예약이 수락됐습니다`,
        html: layout('상담 예약 수락됨', body),
      })
    }

    // ── 3. 거절 → 가족에게 알림 ───────────────────────────────────────────────
    else if (type === 'rejected') {
      const { data: familyConsult } = await admin
        .from('consultations')
        .select('family_id')
        .eq('id', consultationId)
        .single()
      const { data: familyUser } = await admin.auth.admin.getUserById((familyConsult as any)?.family_id)
      const familyEmail = familyUser?.user?.email
      if (!familyEmail) return NextResponse.json({ ok: true, skipped: 'no email' })

      const body = `
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px">
          아쉽게도 <strong>${caregiverName}</strong> 님이 이번 상담 예약을 수락하지 못했습니다.
        </p>
        <table style="width:100%;border-collapse:collapse">
          ${infoRow('날짜', date)}
          ${infoRow('시간', time)}
          ${reply ? infoRow('전문가 메모', reply) : ''}
        </table>
        <p style="color:#6b7280;font-size:13px;margin:16px 0 0">
          다른 전문가를 찾아보세요. CareLink에는 검증된 전문가가 많이 있습니다.
        </p>
        ${ctaButton(`${BASE_URL}/ko/search`, '다른 전문가 찾기 →')}
      `
      await resend.emails.send({
        from: FROM,
        to: familyEmail,
        subject: `[CareLink] 상담 예약 결과를 확인해주세요`,
        html: layout('상담 예약 안내', body),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[email]', err?.message)
    // 이메일 실패해도 서비스 중단 없이 200 반환
    return NextResponse.json({ ok: true, warning: 'email failed' })
  }
}
