import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

export default function Home() {
  return (
    <>
      <Navbar />

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-4 pt-24 pb-16
        bg-gradient-to-b from-emerald-50 to-white">
        <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5
          text-sm font-medium text-emerald-700 shadow-sm mb-8">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          Now accepting early access
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight max-w-2xl mb-6">
          Connect <span className="text-emerald-700">Care</span>,<br />
          Connect <span className="text-emerald-700">People</span>.
        </h1>

        <p className="text-lg text-gray-500 max-w-xl mb-10">
          CareLink connects families with verified caregivers and trusted specialists —
          all in one platform, anywhere in the world.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/auth/signup"
            className="bg-emerald-700 text-white px-8 py-3.5 rounded-full font-semibold text-base
              hover:bg-emerald-800 transition">
            Get Started — It&apos;s Free
          </Link>
          <Link href="/search"
            className="border border-gray-200 text-gray-700 px-8 py-3.5 rounded-full font-semibold text-base
              hover:bg-gray-50 transition">
            Find a Caregiver
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-12 mt-20 text-center">
          {[
            { num: '10M+', label: 'Seniors needing care globally' },
            { num: '2×', label: 'Caregiver demand by 2030' },
            { num: '$1.3T', label: 'Global care economy' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-emerald-700">{s.num}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-4 max-w-5xl mx-auto">
        <p className="text-xs font-bold tracking-widest uppercase text-emerald-700 mb-3">How It Works</p>
        <h2 className="text-4xl font-extrabold tracking-tight mb-4">Simple. Fast. Trusted.</h2>
        <p className="text-gray-500 mb-12 max-w-lg">Three steps to connect with the right care professional in your area.</p>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '📋', title: '1. Post Your Need', desc: 'Describe the care you need — daily assistance, medical support, or specialist advice.' },
            { icon: '🔍', title: '2. Get Matched', desc: 'We match you with verified professionals nearby based on qualifications and reviews.' },
            { icon: '✅', title: '3. Book & Pay Safely', desc: 'Confirm your booking and pay securely. Funds released only after service is complete.' },
          ].map((s) => (
            <div key={s.title} className="bg-white border border-gray-200 rounded-2xl p-8 hover:-translate-y-1
              transition hover:shadow-lg">
              <div className="text-3xl mb-4">{s.icon}</div>
              <h3 className="font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="bg-emerald-50 py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-emerald-700 mb-3">Our Services</p>
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">One Platform, Every Care Need</h2>
          <p className="text-gray-500 mb-12 max-w-lg">From daily caregiving to complex estate matters — CareLink covers the full journey.</p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-emerald-700 text-white rounded-2xl p-10">
              <div className="text-4xl mb-5">🤝</div>
              <h3 className="text-xl font-bold mb-3">Caregiver Matching</h3>
              <p className="opacity-80 text-sm mb-6">Find certified caregivers for your loved ones. Background-checked, reviewed, and ready to help.</p>
              <div className="flex flex-wrap gap-2">
                {['Home Care', 'Medical Assist', 'Dementia Care', 'Respite Care'].map(t => (
                  <span key={t} className="bg-white/20 rounded-full px-3 py-1 text-xs font-medium">{t}</span>
                ))}
              </div>
            </div>

            <div className="bg-indigo-700 text-white rounded-2xl p-10">
              <div className="text-4xl mb-5">📜</div>
              <h3 className="text-xl font-bold mb-3">Estate & Inheritance</h3>
              <p className="opacity-80 text-sm mb-6">Connect with trusted attorneys, tax advisors, and estate planners for professional guidance.</p>
              <div className="flex flex-wrap gap-2">
                {['Will Planning', 'Tax Consult', 'Asset Transfer', 'Legal Advice'].map(t => (
                  <span key={t} className="bg-white/20 rounded-full px-3 py-1 text-xs font-medium">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-800 text-white text-center py-24 px-4">
        <h2 className="text-4xl font-extrabold tracking-tight mb-4">Ready to Find the Right Care?</h2>
        <p className="text-emerald-200 mb-8 max-w-md mx-auto">
          Join thousands of families and caregivers already on CareLink.
        </p>
        <Link href="/auth/signup"
          className="bg-amber-400 text-white px-10 py-4 rounded-full font-bold text-lg
            hover:bg-amber-500 transition inline-block">
          Get Started Free
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 text-center py-8 text-sm">
        <p><span className="text-white font-bold">CareLink</span> · Connecting care, everywhere.</p>
        <p className="mt-2">© 2025 CareLink. All rights reserved.</p>
      </footer>
    </>
  )
}
