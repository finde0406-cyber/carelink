import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error('[delete-account] 인증 실패')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[delete-account] 유저 ID:', user.id)

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[delete-account] SERVICE_ROLE_KEY 없음')
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const { error: profileError } = await adminClient.from('profiles').delete().eq('id', user.id)
  if (profileError) console.error('[delete-account] 프로필 삭제 오류:', profileError.message)

  const { error } = await adminClient.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('[delete-account] auth 삭제 오류:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[delete-account] 삭제 완료')
  return NextResponse.json({ success: true })
}
