import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { paymentId, consultationId, amount } = await req.json()
    if (!paymentId || !consultationId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 포트원 V2 결제 검증
    const portoneRes = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      headers: {
        Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
      },
    })

    if (!portoneRes.ok) {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    const portoneData = await portoneRes.json()

    // 결제 상태 및 금액 검증
    if (portoneData.status !== 'PAID') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }
    if (portoneData.amount?.total !== amount) {
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 상담 조회 (가족 ID 확인 + 요양보호사 ID 가져오기)
    const { data: consultation, error: consultError } = await supabase
      .from('consultations')
      .select('id, family_id, caregiver_id')
      .eq('id', consultationId)
      .eq('family_id', user.id)
      .single()

    if (consultError || !consultation) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }

    // 중복 결제 방지
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('consultation_id', consultationId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Already paid' }, { status: 409 })
    }

    // 요양보호사 user_id 조회
    const { data: cpData } = await supabase
      .from('caregiver_profiles')
      .select('user_id')
      .eq('id', consultation.caregiver_id)
      .single()

    const settleAfter = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    const { error: insertError } = await supabase.from('payments').insert({
      consultation_id: consultationId,
      family_id: user.id,
      caregiver_id: cpData?.user_id ?? null,
      amount,
      portone_payment_id: paymentId,
      status: 'escrow',
      paid_at: new Date().toISOString(),
      settle_after: settleAfter,
    })

    if (insertError) {
      return NextResponse.json({ error: 'Failed to save payment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
