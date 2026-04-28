'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import AvailabilityGrid, { AvailItem } from '@/components/caregivers/AvailabilityGrid'
import { SIDO_LIST, getGunguList, formatRegion } from '@/constants/regions'

const LICENSE_TYPES = [
  '요양보호사 1급',
  '사회복지사 1급',
  '사회복지사 2급',
  '간호사',
  '간호조무사',
  '물리치료사',
  '작업치료사',
  '언어치료사',
  '치매전문요양보호사',
]

const CAREGIVER_SPECIALTIES = [
  '치매케어', '뇌졸중 케어', '욕창 관리', '재활 보조',
  '식사 보조', '목욕 보조', '외출/병원 동행', '일상생활 보조',
  '야간 돌봄', '단기 돌봄', '24시간 케어', '인지활동 지원', '의료기기 관리',
]

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko`,
    { headers: { 'User-Agent': 'CareLink/1.0' } }
  )
  const data = await res.json()
  const addr = data.address || {}
  const parts = [
    addr.city || addr.town || addr.county || addr.state,
    addr.suburb || addr.neighbourhood || addr.district,
  ].filter(Boolean)
  return parts.join(' ') || data.display_name?.split(',').slice(0, 2).join(', ') || ''
}

export default function CaregiverProfilePage() {
  const t = useTranslations('caregiverProfile')
  const tAvail = useTranslations('availability')
  const locale = useLocale()
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationMsg, setLocationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [sido, setSido] = useState('')
  const [gungu, setGungu] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [caregiverProfileId, setCaregiverProfileId] = useState<string | null>(null)
  const [availability, setAvailability] = useState<AvailItem[]>([])
  const [specialties, setSpecialties] = useState<string[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [userName, setUserName] = useState('')
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push(`/${locale}/auth/login`); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (profileData?.full_name) setUserName(profileData.full_name)
      if (profileData?.avatar_url) setAvatarUrl(profileData.avatar_url)

      const { data } = await supabase
        .from('caregiver_profiles')
        .select('*, caregiver_availability(day_of_week, time_slot)')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        setCaregiverProfileId(data.id)
        setForm({
          license_type: data.license_type || '',
          license_number: data.license_number || '',
          experience_years: data.experience_years || 0,
          region: data.region || '',
          hourly_rate: data.hourly_rate || 15000,
          bio: data.bio || '',
          available: data.available ?? true,
        })
        setAvailability(data.caregiver_availability || [])
        setSpecialties(data.specialties || [])

        // 기존 region 값 → sido/gungu 분리
        const savedRegion: string = data.region || ''
        const matchedSido = SIDO_LIST.find(s => savedRegion.startsWith(s)) || ''
        const matchedGungu = matchedSido ? savedRegion.replace(matchedSido, '').trim() : ''
        setSido(matchedSido)
        setGungu(matchedGungu)
      }
      setLoading(false)
    }
    load()
  }, [])

  function toggleSpecialty(label: string) {
    setSpecialties(prev =>
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    )
  }

  async function handleGetLocation() {
    if (!navigator.geolocation) {
      setLocationMsg({ type: 'error', text: '이 브라우저는 위치 서비스를 지원하지 않습니다.' })
      return
    }
    setLocating(true)
    setLocationMsg(null)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
      const address = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
      if (address) {
        const matchedSido = SIDO_LIST.find(s => address.includes(s.replace('특별시','').replace('광역시','').replace('특별자치시','').replace('특별자치도','').replace('도',''))) || ''
        if (matchedSido) {
          setSido(matchedSido)
          const gunguList = getGunguList(matchedSido)
          const matchedGungu = gunguList.find(g => address.includes(g.split(' ')[0])) || ''
          setGungu(matchedGungu)
          setLocationMsg({ type: 'success', text: `✓ ${matchedSido}${matchedGungu ? ' ' + matchedGungu : ''}` })
        } else {
          setLocationMsg({ type: 'success', text: `✓ ${address} (시/도를 직접 선택해주세요)` })
        }
      } else {
        setLocationMsg({ type: 'error', text: '주소 변환에 실패했습니다. 직접 선택해주세요.' })
      }
    } catch (err: unknown) {
      const geoErr = err as GeolocationPositionError
      console.log('[위치 오류] code:', geoErr?.code, 'message:', geoErr?.message)
      if (geoErr?.code === 1) {
        setLocationMsg({ type: 'error', text: '위치 권한이 거부됐습니다. Windows 설정 → 개인 정보 → 위치 → 데스크톱 앱 위치 허용을 켜주세요.' })
      } else if (geoErr?.code === 2) {
        setLocationMsg({ type: 'error', text: '위치를 찾을 수 없습니다 (code 2). 직접 입력해주세요.' })
      } else if (geoErr?.code === 3) {
        setLocationMsg({ type: 'error', text: '위치 요청 시간이 초과됐습니다. 다시 시도해주세요.' })
      } else {
        setLocationMsg({ type: 'error', text: '위치를 가져올 수 없습니다. 직접 입력해주세요.' })
      }
    }
    setLocating(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: '파일 크기가 2MB를 초과합니다.' })
      return
    }

    setAvatarUploading(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setMessage({ type: 'error', text: t('avatarError') })
      setAvatarUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
    setAvatarUrl(publicUrl)
    setMessage({ type: 'success', text: t('avatarSuccess') })
    setAvatarUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const region = formatRegion(sido, gungu)
    const { data: savedProfile, error } = await supabase
      .from('caregiver_profiles')
      .upsert({ user_id: user.id, ...form, region, specialties }, { onConflict: 'user_id' })
      .select('id')
      .single()

    if (error) {
      setMessage({ type: 'error', text: t('error') })
      setSaving(false)
      return
    }

    const profileId = savedProfile?.id ?? caregiverProfileId
    if (profileId) {
      await supabase.from('caregiver_availability').delete().eq('caregiver_id', profileId)
      if (availability.length > 0) {
        await supabase.from('caregiver_availability').insert(
          availability.map(a => ({
            caregiver_id: profileId,
            day_of_week: a.day_of_week,
            time_slot: a.time_slot,
          }))
        )
      }
    }

    setMessage({ type: 'success', text: t('success') })
    setTimeout(() => router.push(`/${locale}/dashboard`), 1200)
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const initials = userName ? userName.slice(0, 2) : '?'

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

          {/* 프로필 사진 */}
          <div className="flex flex-col items-center gap-3 pb-6 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700 self-start">{t('avatarTitle')}</p>
            <div
              onClick={() => !avatarUploading && fileRef.current?.click()}
              className="relative w-24 h-24 rounded-full cursor-pointer group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="프로필"
                  className="w-full h-full object-cover rounded-full border-2 border-gray-100"
                />
              ) : (
                <div className="w-full h-full bg-emerald-100 rounded-full flex items-center justify-center border-2 border-dashed border-emerald-300">
                  <span className="text-2xl font-extrabold text-emerald-600">{initials}</span>
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100
                flex items-center justify-center transition pointer-events-none">
                <span className="text-white text-xl">📷</span>
              </div>
              {avatarUploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400">{avatarUploading ? t('avatarUploading') : t('avatarHint')}</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          {/* 자격증 */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('licenseType')}</label>
              <select
                value={form.license_type}
                onChange={e => setForm(f => ({ ...f, license_type: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none
                  focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition bg-white">
                <option value="">{t('licenseTypePlaceholder')}</option>
                {LICENSE_TYPES.map(lt => (
                  <option key={lt} value={lt}>{lt}</option>
                ))}
              </select>
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

          {/* 경력 / 활동 지역 */}
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
              <div className="flex gap-2 mb-2">
                <select
                  value={sido}
                  onChange={e => { setSido(e.target.value); setGungu('') }}
                  required
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none
                    focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition bg-white">
                  <option value="">시/도 선택</option>
                  {SIDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={locating}
                  title="현재 위치"
                  className="shrink-0 border border-gray-200 rounded-xl px-3.5 hover:border-emerald-400
                    hover:bg-emerald-50 transition disabled:opacity-50 flex items-center justify-center">
                  {locating
                    ? <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    : <span className="text-base">📍</span>
                  }
                </button>
              </div>
              {sido && (
                <select
                  value={gungu}
                  onChange={e => setGungu(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none
                    focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition bg-white">
                  <option value="">구/군 선택 (선택사항)</option>
                  {getGunguList(sido).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
              {locationMsg && (
                <p className={`text-xs mt-1 ${locationMsg.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {locationMsg.text}
                </p>
              )}
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

          {/* 전문 분야 태그 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('specialtiesTitle')}</label>
            <p className="text-xs text-gray-400 mb-3">{t('specialtiesSubtitle')}</p>
            <div className="flex flex-wrap gap-2">
              {CAREGIVER_SPECIALTIES.map(label => {
                const selected = specialties.includes(label)
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleSpecialty(label)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition
                      ${selected
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-700'
                      }`}>
                    {selected && <span className="mr-1">✓</span>}
                    {label}
                  </button>
                )
              })}
            </div>
            {specialties.length > 0 && (
              <p className="text-xs text-emerald-600 mt-2">{specialties.length}개 선택됨</p>
            )}
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

          {/* 근무 가능 시간 */}
          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800">{tAvail('title')}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{tAvail('subtitle')}</p>
            </div>
            <AvailabilityGrid availability={availability} editable onChange={setAvailability} />
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
