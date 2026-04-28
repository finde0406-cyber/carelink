import Link from 'next/link'

export async function generateMetadata() {
  return { title: '이용약관 | CareLink' }
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}`} className="text-xl font-extrabold text-emerald-700">
            Care<span className="text-amber-400">Link</span>
          </Link>
          <Link href={`/${locale}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← 홈
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">이용약관</h1>
        <p className="text-sm text-gray-400 mb-10">최종 업데이트: 2025년 1월 1일</p>

        <div className="space-y-10 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제1조 (목적)</h2>
            <p>본 약관은 CareLink(이하 "회사")가 제공하는 케어 전문가 매칭 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제2조 (정의)</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>"서비스"란 요양보호사, 간호사, 법률·세무 전문가 등 케어 전문가와 이를 필요로 하는 가족을 연결하는 온라인 매칭 플랫폼을 의미합니다.</li>
              <li>"이용자"란 본 약관에 동의하고 서비스를 이용하는 회원을 의미합니다.</li>
              <li>"파트너"란 서비스에 자신의 전문 서비스를 등록한 요양보호사 및 전문가를 의미합니다.</li>
              <li>"가족"이란 케어 서비스를 의뢰하는 이용자를 의미합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제3조 (약관의 효력 및 변경)</h2>
            <p>① 본 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</p>
            <p className="mt-2">② 회사는 관련 법령에 위반하지 않는 범위에서 약관을 개정할 수 있으며, 변경 시 7일 전에 서비스 내 공지사항을 통해 고지합니다. 중요한 변경의 경우 30일 전에 고지합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제4조 (서비스 이용)</h2>
            <p>① 서비스는 만 14세 이상의 개인이 이용할 수 있습니다.</p>
            <p className="mt-2">② 이용자는 본인의 실제 정보를 바탕으로 회원가입을 해야 하며, 타인의 정보를 도용하거나 허위 정보를 입력해서는 안 됩니다.</p>
            <p className="mt-2">③ 하나의 이메일로 하나의 계정만 생성할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제5조 (금지 행위)</h2>
            <p>이용자는 아래의 행위를 해서는 안 됩니다.</p>
            <ul className="mt-3 space-y-1 list-disc pl-5">
              <li>타인의 개인정보 무단 수집·이용</li>
              <li>허위 자격증 정보 입력 및 허위 프로필 작성</li>
              <li>서비스를 통해 알게 된 상대방에게 불법적인 제안이나 불필요한 연락</li>
              <li>스팸성 리뷰 작성 또는 리뷰 조작</li>
              <li>서비스 시스템에 대한 해킹, 크롤링, 부정 접근 시도</li>
              <li>회사의 사전 동의 없는 영리 목적의 광고 게재</li>
              <li>기타 관련 법령 위반 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제6조 (파트너의 의무)</h2>
            <p>① 파트너는 자신의 자격증 및 경력 정보를 사실에 근거하여 정확하게 입력해야 합니다.</p>
            <p className="mt-2">② 파트너는 수락한 상담 예약에 성실히 응해야 하며, 부득이한 사정으로 불참할 경우 사전에 가족에게 충분히 안내해야 합니다.</p>
            <p className="mt-2">③ 파트너는 서비스를 통해 알게 된 가족의 개인정보를 서비스 목적 외에 사용해서는 안 됩니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제7조 (책임의 한계)</h2>
            <p>① 회사는 이용자 간의 거래, 상담, 계약에서 발생하는 분쟁에 대해 직접적인 책임을 지지 않습니다. 회사는 매칭 플랫폼을 제공하는 역할을 하며, 실제 서비스 제공 계약은 파트너와 가족 간에 체결됩니다.</p>
            <p className="mt-2">② 회사는 천재지변, 전쟁, 서비스 인프라 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</p>
            <p className="mt-2">③ 회사는 이용자가 서비스에 게재한 정보의 신뢰성, 정확성에 대해 보증하지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제8조 (서비스 중단)</h2>
            <p>회사는 시스템 점검, 교체, 고장, 기타 운영상 합리적인 이유가 있을 때 서비스 제공을 일시적으로 중단할 수 있으며, 이 경우 사전에 공지합니다. 단, 긴급한 경우 사후 공지할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제9조 (회원 탈퇴 및 자격 상실)</h2>
            <p>① 이용자는 언제든지 서비스 내 회원 탈퇴 기능을 통해 탈퇴할 수 있습니다.</p>
            <p className="mt-2">② 이용자가 본 약관의 금지 행위를 위반한 경우, 회사는 사전 통보 없이 해당 계정을 제한하거나 삭제할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제10조 (분쟁 해결)</h2>
            <p>본 약관과 관련된 분쟁은 대한민국 법률을 준거법으로 하며, 회사의 주된 사무소 소재지를 관할하는 법원을 합의 관할로 합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">부칙</h2>
            <p>본 약관은 2025년 1월 1일부터 시행됩니다.</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <Link href={`/${locale}/privacy`} className="text-emerald-700 text-sm font-semibold hover:underline mr-6">
            개인정보처리방침 →
          </Link>
          <Link href={`/${locale}`} className="text-gray-400 text-sm hover:text-gray-600">
            홈으로
          </Link>
        </div>
      </main>
    </div>
  )
}
