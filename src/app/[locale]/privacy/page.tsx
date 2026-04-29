import Link from 'next/link'

export async function generateMetadata() {
  return { title: '개인정보처리방침 | CareLink' }
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">개인정보처리방침</h1>
        <p className="text-sm text-gray-400 mb-10">최종 업데이트: 2025년 1월 1일</p>

        <div className="prose prose-gray max-w-none space-y-10 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">1. 수집하는 개인정보 항목</h2>
            <p>CareLink(이하 "회사")는 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.</p>
            <ul className="mt-3 space-y-1 list-disc pl-5">
              <li>필수: 이름, 이메일 주소, 비밀번호(암호화 저장), 회원 유형(가족/요양보호사/전문가)</li>
              <li>선택: 프로필 사진, 서비스 지역, 자격증 종류 및 번호, 경력, 시급, 자기소개, 가용 시간</li>
              <li>자동 수집: 서비스 이용 기록, 접속 IP, 접속 일시</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">2. 개인정보 수집 및 이용 목적</h2>
            <ul className="space-y-1 list-disc pl-5">
              <li>회원 가입 및 본인 확인</li>
              <li>요양보호사·전문가와 가족 간 매칭 서비스 제공</li>
              <li>상담 예약 및 알림 발송</li>
              <li>서비스 개선 및 통계 분석</li>
              <li>법령에 따른 의무 이행</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">3. 개인정보 보유 및 이용 기간</h2>
            <p>회원 탈퇴 시까지 보유하며, 탈퇴 요청 시 지체 없이 파기합니다. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보존합니다.</p>
            <ul className="mt-3 space-y-1 list-disc pl-5">
              <li>전자상거래 관련 기록: 5년 (전자상거래법)</li>
              <li>소비자 불만 및 분쟁 기록: 3년 (전자상거래법)</li>
              <li>접속 로그: 3개월 (통신비밀보호법)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">4. 개인정보 제3자 제공</h2>
            <p>회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 아래의 경우는 예외로 합니다.</p>
            <ul className="mt-3 space-y-1 list-disc pl-5">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">5. 개인정보 처리 위탁</h2>
            <p>회사는 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
            <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">수탁업체</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">위탁 업무</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-100">
                    <td className="px-4 py-2">Supabase Inc.</td>
                    <td className="px-4 py-2">데이터베이스 및 인증 서비스 운영</td>
                  </tr>
                  <tr className="border-t border-gray-100">
                    <td className="px-4 py-2">Vercel Inc.</td>
                    <td className="px-4 py-2">서비스 호스팅 및 배포</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">6. 이용자의 권리</h2>
            <p>이용자는 언제든지 아래의 권리를 행사할 수 있습니다.</p>
            <ul className="mt-3 space-y-1 list-disc pl-5">
              <li>개인정보 열람 요청</li>
              <li>개인정보 정정 및 삭제 요청</li>
              <li>개인정보 처리 정지 요청</li>
              <li>회원 탈퇴를 통한 개인정보 파기 요청</li>
            </ul>
            <p className="mt-3">위 권리 행사는 서비스 내 계정 설정 또는 아래 문의처를 통해 하실 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">7. 개인정보 보호책임자</h2>
            <div className="bg-gray-50 rounded-xl p-4 space-y-1">
              <p><span className="font-medium">서비스명:</span> CareLink</p>
              <p><span className="font-medium">이메일:</span> privacy@carelink.app</p>
            </div>
            <p className="mt-3">개인정보 관련 불만이나 피해 구제를 위해 아래 기관에 문의하실 수 있습니다.</p>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>개인정보 침해신고센터: privacy.kisa.or.kr / 국번 없이 118</li>
              <li>개인정보 분쟁조정위원회: www.kopico.go.kr / 1833-6972</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">8. 쿠키 사용</h2>
            <p>회사는 로그인 세션 유지 등 필수 기능을 위해 쿠키를 사용합니다. 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 서비스 일부 기능이 제한될 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">9. 방침 변경</h2>
            <p>본 방침은 법령·정책의 변경이나 서비스 변화에 따라 개정될 수 있으며, 변경 시 서비스 내 공지사항을 통해 7일 전에 안내합니다.</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <Link href={`/${locale}/terms`} className="text-emerald-700 text-sm font-semibold hover:underline mr-6">
            이용약관 →
          </Link>
          <Link href={`/${locale}`} className="text-gray-400 text-sm hover:text-gray-600">
            홈으로
          </Link>
        </div>
      </main>
    </div>
  )
}
