'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'

const WHO_CAN_JOIN = [
  { icon: '👨‍⚕️', ko: '요양보호사', en: 'Caregivers' },
  { icon: '👩‍⚕️', ko: '간호사·간호조무사', en: 'Nurses' },
  { icon: '🧑‍💼', ko: '사회복지사', en: 'Social Workers' },
  { icon: '⚖️', ko: '법무사·변호사', en: 'Legal Experts' },
  { icon: '💰', ko: '세무사·회계사', en: 'Tax Advisors' },
  { icon: '🏥', ko: '작업치료사', en: 'Therapists' },
]

export default function PartnersPage() {
  const t = useTranslations('partners')
  const locale = useLocale()

  return (
    <div className="min-h-screen bg-white pt-16">

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-amber-300 blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 pt-36 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-amber-300 rounded-full animate-pulse" />
            무료로 시작하세요
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-5 whitespace-pre-line">
            {t('heroTitle')}
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10">
            {t('heroSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${locale}/auth/signup`}
              className="bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-8 py-4 rounded-full text-lg transition shadow-lg"
            >
              {t('heroCtaPrimary')}
            </Link>
            <a
              href="#how"
              className="border-2 border-white/60 hover:border-white text-white font-semibold px-8 py-4 rounded-full text-lg transition"
            >
              {t('heroCtaSecondary')}
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
            {[
              { num: t('stat1Num'), label: t('stat1Label') },
              { num: t('stat2Num'), label: t('stat2Label') },
              { num: t('stat3Num'), label: t('stat3Label') },
              { num: t('stat4Num'), label: t('stat4Label') },
            ].map((s, i) => (
              <div key={i} className="bg-white/15 backdrop-blur rounded-2xl p-4">
                <div className="text-2xl font-extrabold text-amber-300">{s.num}</div>
                <div className="text-sm text-white/80 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <span className="text-emerald-600 text-sm font-bold uppercase tracking-widest">{t('howTitle')}</span>
          <h2 className="text-3xl font-extrabold text-gray-900 mt-2 mb-12">3단계로 바로 시작</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: t('step1Title'), desc: t('step1Desc'), icon: '📝' },
              { step: '02', title: t('step2Title'), desc: t('step2Desc'), icon: '📨' },
              { step: '03', title: t('step3Title'), desc: t('step3Desc'), icon: '🤝' },
            ].map((s) => (
              <div key={s.step} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 relative">
                <div className="absolute -top-4 left-8 bg-emerald-700 text-white text-xs font-bold px-3 py-1 rounded-full">
                  STEP {s.step}
                </div>
                <div className="text-4xl mb-4">{s.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-emerald-600 text-sm font-bold uppercase tracking-widest">{t('benefitsTitle')}</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-2">CareLink를 선택하는 이유</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: t('benefit1Icon'), title: t('benefit1Title'), desc: t('benefit1Desc') },
              { icon: t('benefit2Icon'), title: t('benefit2Title'), desc: t('benefit2Desc') },
              { icon: t('benefit3Icon'), title: t('benefit3Title'), desc: t('benefit3Desc') },
              { icon: t('benefit4Icon'), title: t('benefit4Title'), desc: t('benefit4Desc') },
            ].map((b, i) => (
              <div key={i} className="flex gap-5 bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="text-3xl flex-shrink-0">{b.icon}</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{b.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Can Join */}
      <section className="py-20 bg-emerald-50">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <span className="text-emerald-600 text-sm font-bold uppercase tracking-widest">{t('whoTitle')}</span>
          <h2 className="text-3xl font-extrabold text-gray-900 mt-2 mb-3">{t('whoTitle')}</h2>
          <p className="text-gray-500 mb-10">{t('whoSubtitle')}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {WHO_CAN_JOIN.map((w, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 flex flex-col items-center gap-3">
                <span className="text-4xl">{w.icon}</span>
                <span className="font-semibold text-gray-800 text-sm">{w.ko}</span>
                <span className="text-xs text-gray-400">{w.en}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-emerald-600 text-sm font-bold uppercase tracking-widest">{t('roadmapTitle')}</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-2">{t('roadmapTitle')}</h2>
            <p className="text-gray-500 mt-3">{t('roadmapSubtitle')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Now */}
            <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                <span className="text-sm font-bold text-emerald-700">{t('roadmapNowLabel')}</span>
              </div>
              <ul className="space-y-2">
                {['nowFeature1','nowFeature2','nowFeature3','nowFeature4','nowFeature5'].map(k => (
                  <li key={k} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    {t(k as any)}
                  </li>
                ))}
              </ul>
            </div>

            {/* Soon */}
            <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
                <span className="text-sm font-bold text-amber-600">{t('roadmapSoonLabel')}</span>
              </div>
              <ul className="space-y-2">
                {['soonFeature1','soonFeature2','soonFeature3','soonFeature4'].map(k => (
                  <li key={k} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-amber-500 mt-0.5">◎</span>
                    {t(k as any)}
                  </li>
                ))}
              </ul>
            </div>

            {/* Future */}
            <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 bg-gray-300 rounded-full" />
                <span className="text-sm font-bold text-gray-500">{t('roadmapFutureLabel')}</span>
              </div>
              <ul className="space-y-2">
                {['futureFeature1','futureFeature2','futureFeature3','futureFeature4'].map(k => (
                  <li key={k} className="flex items-start gap-2 text-sm text-gray-500">
                    <span className="mt-0.5">○</span>
                    {t(k as any)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900">{t('faqTitle')}</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: t('faq1Q'), a: t('faq1A') },
              { q: t('faq2Q'), a: t('faq2A') },
              { q: t('faq3Q'), a: t('faq3A') },
              { q: t('faq4Q'), a: t('faq4A') },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">Q. {faq.q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 등록 선택 섹션 */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <span className="text-emerald-600 text-sm font-bold uppercase tracking-widest">파트너 등록</span>
          <h2 className="text-3xl font-extrabold text-gray-900 mt-2 mb-3">어떤 전문가로 등록하시겠어요?</h2>
          <p className="text-gray-500 mb-10">가입 후 해당 등록 페이지로 이동합니다</p>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-left hover:border-emerald-400 transition group">
              <div className="text-4xl mb-4">🏥</div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-2">요양보호사 · 의료 전문가</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">요양보호사, 간호사, 사회복지사, 물리치료사 등 돌봄 서비스 전문가</p>
              <Link href={`/${locale}/caregivers/profile`}
                className="inline-block bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-emerald-800 transition">
                요양보호사로 등록하기 →
              </Link>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-8 text-left hover:border-blue-400 transition group">
              <div className="text-4xl mb-4">⚖️</div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-2">법률 · 세무 전문가</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">변호사, 세무사, 법무사, 공인회계사 등 법률·세무 상담 전문가</p>
              <Link href={`/${locale}/specialists/profile`}
                className="inline-block bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-blue-700 transition">
                법률·세무 전문가로 등록하기 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="py-20 bg-gradient-to-r from-emerald-700 to-teal-500 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold mb-4">{t('ctaTitle')}</h2>
          <p className="text-white/80 mb-8 text-lg">{t('ctaDesc')}</p>
          <Link
            href={`/${locale}/auth/signup`}
            className="inline-block bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-10 py-4 rounded-full text-lg transition shadow-xl"
          >
            {t('ctaBtn')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-500 text-center py-8 text-sm">
        <p className="mb-3 text-white font-bold">CareLink</p>
        <div className="flex justify-center gap-6 mb-3">
          <Link href={`/${locale}/terms`} className="hover:text-gray-300 transition">이용약관</Link>
          <Link href={`/${locale}/privacy`} className="hover:text-gray-300 transition">개인정보처리방침</Link>
          <Link href={`/${locale}`} className="hover:text-gray-300 transition">홈</Link>
        </div>
        <p>© 2025 CareLink. All rights reserved.</p>
      </footer>
    </div>
  )
}
