'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function CaregiverProfilePage() {
  const t = useTranslations('caregiverProfile')
  const locale = useLocale()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({
    license_type: '',
    license_number: '',
    experience_years: 0,
    region: '',
    hourly_rate: 15000,
    bio: '',
    available: true,
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push(`/${locale}/auth/login`); return }

      const { data } = await supabase
        .from('caregiver_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setForm({
          license_type: data.license_type || '',
          license_number: data.license_number || '',
          experience_years: data.experience_years || 0,
          region: data.region || '',
          hourly_rate: data.hourly_rate || 15000,
          bio: data.bio || '',
          available: data.available ?? true,
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('caregiver_profiles')
      .upsert({ user_id: user.id, ...form }, { onConflict: 'user_id' })

    if (error) {
      setMessage({ type: 'error', text: t('error') })
    } else {
      setMessage({ type: 'success', text: t('success') })
      setTimeout(() => router.push(`/${locale}/dashboard`), 1200)
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}`} className="text-xl font-extrabold text-emerald-700">
            Care<span className="text-amber-400">Link</span>
          </Link>
          <Link href={`/${locale}/dashboard`} className="text-sm text-gray-500 hover:text-gray-700">
            ← 대시보드
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t('subtitle')}</p>
        </div>

        {message && (
          <div className={`rounded-xl px-4 py-3 text-sm mb-6 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-600'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 space-y-6">

          {/* 자격증 */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('licenseType')}</label>
              <input
                type="text"
                value={form.license_type}
                onChange={e => setForm(f => ({ ...f, license_type: e.target.value }))}
                placeholder={t('licenseTypePlaceholder')}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                  focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('licenseNumber')}</label>
              <input
                type="text"
                value={form.license_number}
                onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))}
                placeholder={t('licenseNumberPlaceholder')}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                  focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
              />
            </div>
          </div>

          {/* 경력 / 지역 */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('experience')}</label>
              <input
                type="number"
                min={0}
                max={50}
                value={form.experience_years}
                onChange={e => setForm(f => ({ ...f, experience_years: Number(e.target.value) }))}
                placeholder={t('experiencePlaceholder')}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                  focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('region')}</label>
              <input
                type="text"
                value={form.region}
                onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                placeholder={t('regionPlaceholder')}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                  focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
              />
            </div>
          </div>

          {/* 시급 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('hourlyRate')}</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={500}
                value={form.hourly_rate}
                onChange={e => setForm(f => ({ ...f, hourly_rate: Number(e.target.value) }))}
                placeholder={t('hourlyRatePlaceholder')}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                  focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₩</span>
            </div>
          </div>

          {/* 자기소개 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('bio')}</label>
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder={t('bioPlaceholder')}
              rows={5}
              minLength={50}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{form.bio.length}자</p>
          </div>

          {/* 구직 중 여부 */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setForm(f => ({ ...f, available: !f.available }))}
              className={`w-11 h-6 rounded-full transition relative ${form.available ? 'bg-emerald-600' : 'bg-gray-200'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all
                ${form.available ? 'left-6' : 'left-1'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">{t('available')}</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-700 text-white py-3.5 rounded-xl font-semibold
              hover:bg-emerald-800 transition disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? t('loading') : t('submit')}
          </button>
        </form>
      </main>
    </div>
  )
}
