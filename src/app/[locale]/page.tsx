import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import Navbar from '@/components/layout/Navbar'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'hero' })
  return { title: `CareLink — ${t('badge')}` }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'hero' })
  const h = await getTranslations({ locale, namespace: 'howItWorks' })
  const s = await getTranslations({ locale, namespace: 'services' })
  const c = await getTranslations({ locale, namespace: 'cta' })
  const f = await getTranslations({ locale, namespace: 'footer' })

  const careTags = s.raw('care.tags') as string[]
  const estateTags = s.raw('estate.tags') as string[]

  return (
    <>
      <Navbar />

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-4 pt-24 pb-16
        bg-gradient-to-b from-emerald-50 to-white">
        <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5
          text-sm font-medium text-emerald-700 shadow-sm mb-8">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          {t('badge')}
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight max-w-2xl mb-6">
          <span className="text-emerald-700">{t('title1')}</span>{' '}
          <span className="text-gray-900">{t('titleConnect')}</span>
        </h1>

        <p className="text-lg text-gray-500 max-w-xl mb-10">{t('desc')}</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/${locale}/auth/signup`}
            className="bg-emerald-700 text-white px-8 py-3.5 rounded-full font-semibold text-base
              hover:bg-emerald-800 transition">
            {t('cta1')}
          </Link>
          <Link href={`/${locale}/search`}
            className="border border-gray-200 text-gray-700 px-8 py-3.5 rounded-full font-semibold text-base
              hover:bg-gray-50 transition">
            {t('cta2')}
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-12 mt-20 text-center">
          {[
            { num: t('stat1Num'), label: t('stat1Label') },
            { num: t('stat2Num'), label: t('stat2Label') },
            { num: t('stat3Num'), label: t('stat3Label') },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-3xl font-extrabold text-emerald-700">{item.num}</div>
              <div className="text-sm text-gray-500 mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-4 max-w-5xl mx-auto">
        <p className="text-xs font-bold tracking-widest uppercase text-emerald-700 mb-3">{h('tag')}</p>
        <h2 className="text-4xl font-extrabold tracking-tight mb-4">{h('title')}</h2>
        <p className="text-gray-500 mb-12 max-w-lg">{h('desc')}</p>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '📋', title: h('step1Title'), desc: h('step1Desc') },
            { icon: '🔍', title: h('step2Title'), desc: h('step2Desc') },
            { icon: '✅', title: h('step3Title'), desc: h('step3Desc') },
          ].map((step) => (
            <div key={step.title} className="bg-white border border-gray-200 rounded-2xl p-8
              hover:-translate-y-1 transition hover:shadow-lg">
              <div className="text-3xl mb-4">{step.icon}</div>
              <h3 className="font-bold text-lg mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="bg-emerald-50 py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-emerald-700 mb-3">{s('tag')}</p>
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">{s('title')}</h2>
          <p className="text-gray-500 mb-12 max-w-lg">{s('desc')}</p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-emerald-700 text-white rounded-2xl p-10">
              <div className="text-4xl mb-5">🤝</div>
              <h3 className="text-xl font-bold mb-3">{s('care.title')}</h3>
              <p className="opacity-80 text-sm mb-6">{s('care.desc')}</p>
              <div className="flex flex-wrap gap-2">
                {careTags.map((tag) => (
                  <span key={tag} className="bg-white/20 rounded-full px-3 py-1 text-xs font-medium">{tag}</span>
                ))}
              </div>
            </div>

            <div className="bg-indigo-700 text-white rounded-2xl p-10">
              <div className="text-4xl mb-5">📜</div>
              <h3 className="text-xl font-bold mb-3">{s('estate.title')}</h3>
              <p className="opacity-80 text-sm mb-6">{s('estate.desc')}</p>
              <div className="flex flex-wrap gap-2">
                {estateTags.map((tag) => (
                  <span key={tag} className="bg-white/20 rounded-full px-3 py-1 text-xs font-medium">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-800 text-white text-center py-24 px-4">
        <h2 className="text-4xl font-extrabold tracking-tight mb-4">{c('title')}</h2>
        <p className="text-emerald-200 mb-8 max-w-md mx-auto">{c('desc')}</p>
        <Link href={`/${locale}/auth/signup`}
          className="bg-amber-400 text-white px-10 py-4 rounded-full font-bold text-lg
            hover:bg-amber-500 transition inline-block">
          {c('button')}
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 text-center py-10 text-sm">
        <p className="mb-3"><span className="text-white font-bold">CareLink</span> · {f('tagline')}</p>
        <div className="flex justify-center gap-6 mb-4 text-gray-500">
          <Link href={`/${locale}/terms`} className="hover:text-gray-300 transition">이용약관</Link>
          <Link href={`/${locale}/privacy`} className="hover:text-gray-300 transition">개인정보처리방침</Link>
          <Link href={`/${locale}/partners`} className="hover:text-gray-300 transition">파트너 등록</Link>
        </div>
        <p>{f('rights')}</p>
      </footer>
    </>
  )
}
