'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import AvailabilityGrid, { AvailItem } from '@/components/caregivers/AvailabilityGrid'
import { SIDO_LIST, getGunguList, formatRegion } from '@/constants/regions'

const LICENSE_TYPES = [
  '요양보호사 1급', '사회복지사 1급', '사회복지사 2급',
  '간호사', '간호조무사', '물리치료사', '작업치료사', '언어치료사', '치매전문요양보호사',
]

const CAREGIVER_SPECIALTIES = [
  '치매케어', '뇌졸중 케어', '욕창 관리', '재활 보조',
  '식사 보조', '목욕 보조', '외출/병원 동행', '일상생활 보조',
  '야간 돌봄', '단기 돌봄', '24시간 케어', '인지활동 지원', '의료기기 관리',
]

const STEPS = [
  { num: 1, label: '자격증', desc: '어떤 자격증을 가지고 계세요?' },
  { num: 2, label: '경력·지역', desc: '활동 지역과 경력을 알려주세요' },
  { num: 3, label: '전문 분야', desc: '잘하시는 분야를 선택해 주세요' },
  { num: 4, label: '근무 일정', desc: '언제 일하실 수 있나요?' },
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

  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [step, setStep]                   = useState(1)
  const [dir, setDir]                     = useState<'fwd' | 'bwd'>('fwd')
  const [locating, setLocating]           = useState(false)
  const [locationMsg, setLocationMsg]     = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [sido, setSido]                   = useState('')
  const [gungu, setGungu]                 = useState('')
  const [message, setMessage]             = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [caregiverProfileId, setCaregiverProfileId] = useState<string | null>(null)
  const [availability, setAvailability]   = useState<AvailItem[]>([])
  const [specialties, setSpecialties]     = useState<string[]>([])
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [userName, setUserName]           = useState('')
  const [stepErrors, setStepErrors]       = useState<Record<number, string>>({})
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

  function goNext() { setDir('fwd'); setStep(s => Math.min(s + 1, 4)) }
  function goPrev() { setDir('bwd'); setStep(s => Math.max(s - 1, 1)) }

  function validateStep(n: number): string {
    if (n === 1) {
      if (!form.license_type) return '자격증 종류를 선택해 주세요'
      if (!form.license_number.trim()) return '자격증 번호를 입력해 주세요'
    }
    if (n === 2) {
      if (!sido) return '활동 지역(시/도)을 선택해 주세요'
      if (!form.hourly_rate || form.hourly_rate < 1000) return '시급을 입력해 주세요'
    }
    if (n === 3) {
      if (form.bio.trim().length < 50) return `자기소개를 50자 이상 작성해 주세요 (현재 ${form.bio.trim().length}자)`
    }
    return ''
  }

  function handleNext() {
    const err = validateStep(step)
    if (err) { setStepErrors(prev => ({ ...prev, [step]: err })); return }
    setStepErrors(prev => ({ ...prev, [step]: '' }))
    goNext()
  }

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
        const matchedSido = SIDO_LIST.find(s =>
          address.includes(s.replace('특별시','').replace('광역시','').replace('특별자치시','').replace('특별자치도','').replace('도',''))
        ) || ''
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
      if (geoErr?.code === 1) setLocationMsg({ type: 'error', text: '위치 권한이 거부됐습니다.' })
      else if (geoErr?.code === 3) setLocationMsg({ type: 'error', text: '위치 요청 시간이 초과됐습니다.' })
      else setLocationMsg({ type: 'error', text: '위치를 가져올 수 없습니다. 직접 입력해주세요.' })
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) { setAvatarUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
    setAvatarUrl(publicUrl)
    setAvatarUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit() {
    setSaving(true)
    setMessage(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const region = formatRegion(sido, gungu)
    const { data: savedProfile, error } = await supabase
      .from('caregiver_profiles')
      .upsert({ user_id: user.id, ...form, region, specialties }, { onConflict: 'user_id' })
      .select('id').single()
    if (error) { setMessage({ type: 'error', text: t('error') }); setSaving(false); return }
    const profileId = savedProfile?.id ?? caregiverProfileId
    if (profileId) {
      await supabase.from('caregiver_availability').delete().eq('caregiver_id', profileId)
      if (availability.length > 0) {
        await supabase.from('caregiver_availability').insert(
          availability.map(a => ({ caregiver_id: profileId, day_of_week: a.day_of_week, time_slot: a.time_slot }))
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
  const currentStepInfo = STEPS[step - 1]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-white">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href={`/${locale}`} className="text-xl font-extrabold text-emerald-700">
            Care<span className="text-amber-400">Link</span>
          </Link>
          <Link href={`/${locale}/dashboard`} className="text-sm text-gray-400 hover:text-gray-600 transition">
            ← 대시보드
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">

        {/* 상단 진행 표시 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                    transition-all duration-300
                    ${step > s.num
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                      : step === s.num
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 scale-110'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                    {step > s.num
                      ? <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                          <path d="M1.5 6l4 4.5 7-9" stroke="white" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      : s.num
                    }
                  </div>
                  <span className={`text-xs mt-1 font-medium transition-colors duration-200
                    ${step === s.num ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all duration-500"
                    style={{ background: step > s.num ? '#10b981' : '#e5e7eb' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg shadow-gray-100/60 border border-gray-100 overflow-hidden">

          {/* 진행 바 */}
          <div className="h-1 bg-gray-100">
            <div className="h-full bg-emerald-500 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${(step / 4) * 100}%` }} />
          </div>

          <div className="p-7">

            {/* Step 1: 자격증 + 프로필 사진 */}
            {step === 1 && (
              <div key="p1" className={dir === 'fwd' ? 'step-fwd' : 'step-bwd'}>
                <p className="text-xs font-bold text-emerald-600 tracking-wide uppercase mb-1">1 / 4 단계</p>
                <h2 className="text-xl font-extrabold text-gray-900 mb-1">{currentStepInfo.desc}</h2>
                <p className="text-sm text-gray-400 mb-6">보유하신 자격증 정보를 입력해 주세요</p>

                {/* 프로필 사진 */}
                <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-2xl">
                  <div
                    onClick={() => !avatarUploading && fileRef.current?.click()}
                    className="relative w-16 h-16 rounded-2xl cursor-pointer shrink-0 group">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="프로필" className="w-full h-full object-cover rounded-2xl border border-gray-100" />
                      : <div className="w-full h-full bg-emerald-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-emerald-300">
                          <span className="text-lg font-extrabold text-emerald-600">{initials}</span>
                        </div>
                    }
                    <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100
                      flex items-center justify-center transition">
                      <span className="text-white text-sm">📷</span>
                    </div>
                    {avatarUploading && (
                      <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">프로필 사진</p>
                    <p className="text-xs text-gray-400 mt-0.5">클릭해서 사진을 업로드해 주세요</p>
                    <p className="text-xs text-gray-300 mt-0.5">최대 2MB · JPG, PNG</p>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      자격증 종류 <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={form.license_type}
                      onChange={e => setForm(f => ({ ...f, license_type: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none
                        focus:border-emerald-500 bg-gray-50 focus:bg-white transition">
                      <option value="">선택해 주세요</option>
                      {LICENSE_TYPES.map(lt => <option key={lt} value={lt}>{lt}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      자격증 번호 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.license_number}
                      onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))}
                      placeholder="예) 제 2023-12345호"
                      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none
                        focus:border-emerald-500 bg-gray-50 focus:bg-white transition"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">자격증에 기재된 번호를 그대로 입력해 주세요</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: 경력 · 지역 · 시급 */}
            {step === 2 && (
              <div key="p2" className={dir === 'fwd' ? 'step-fwd' : 'step-bwd'}>
                <p className="text-xs font-bold text-emerald-600 tracking-wide uppercase mb-1">2 / 4 단계</p>
                <h2 className="text-xl font-extrabold text-gray-900 mb-1">{currentStepInfo.desc}</h2>
                <p className="text-sm text-gray-400 mb-6">활동 지역과 경력 정보를 입력해 주세요</p>

                <div className="space-y-5">
                  {/* 지역 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      활동 지역 <span className="text-red-400">*</span>
                    </label>
                    <div className="flex gap-2 mb-2">
                      <select
                        value={sido}
                        onChange={e => { setSido(e.target.value); setGungu('') }}
                        className="flex-1 border-2 border-gray-200 rounded-2xl px-3 py-3.5 text-sm outline-none
                          focus:border-emerald-500 bg-gray-50 focus:bg-white transition">
                        <option value="">시/도 선택</option>
                        {SIDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={locating}
                        title="현재 위치 자동 입력"
                        className="shrink-0 w-12 border-2 border-gray-200 rounded-2xl hover:border-emerald-400
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
                        className="w-full border-2 border-gray-200 rounded-2xl px-3 py-3.5 text-sm outline-none
                          focus:border-emerald-500 bg-gray-50 focus:bg-white transition">
                        <option value="">구/군 선택 (선택사항)</option>
                        {getGunguList(sido).map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    )}
                    {locationMsg && (
                      <p className={`text-xs mt-1.5 ${locationMsg.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {locationMsg.text}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5">📍 버튼을 누르면 현재 위치로 자동 입력돼요</p>
                  </div>

                  {/* 경력 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">경력 연수</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number" min={0} max={50}
                        value={form.experience_years}
                        onChange={e => setForm(f => ({ ...f, experience_years: Number(e.target.value) }))}
                        className="w-24 border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none
                          focus:border-emerald-500 bg-gray-50 focus:bg-white transition text-center font-bold"
                      />
                      <span className="text-sm text-gray-500">년</span>
                      <p className="text-xs text-gray-400">처음이시면 0년으로 입력해 주세요</p>
                    </div>
                  </div>

                  {/* 시급 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      시간당 요금 <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number" min={0} step={500}
                        value={form.hourly_rate}
                        onChange={e => setForm(f => ({ ...f, hourly_rate: Number(e.target.value) }))}
                        className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none
                          focus:border-emerald-500 bg-gray-50 focus:bg-white transition pr-10"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">원</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">최저임금 기준 시간당 9,860원 이상을 권장해요</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: 전문 분야 + 자기소개 */}
            {step === 3 && (
              <div key="p3" className={dir === 'fwd' ? 'step-fwd' : 'step-bwd'}>
                <p className="text-xs font-bold text-emerald-600 tracking-wide uppercase mb-1">3 / 4 단계</p>
                <h2 className="text-xl font-extrabold text-gray-900 mb-1">{currentStepInfo.desc}</h2>
                <p className="text-sm text-gray-400 mb-6">해당되는 항목을 모두 선택해 주세요</p>

                {/* 전문 분야 */}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-700 mb-3">전문 분야 (여러 개 선택 가능)</p>
                  <div className="flex flex-wrap gap-2">
                    {CAREGIVER_SPECIALTIES.map(label => {
                      const selected = specialties.includes(label)
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => toggleSpecialty(label)}
                          className={`px-3.5 py-2 rounded-full text-sm font-medium border-2 transition active:scale-[0.96]
                            ${selected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
                            }`}>
                          {selected && (
                            <span className="mr-1 text-xs">✓</span>
                          )}
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  {specialties.length > 0 && (
                    <p className="text-xs text-emerald-600 mt-2 font-semibold">{specialties.length}개 선택됨</p>
                  )}
                </div>

                {/* 자기소개 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    자기소개 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="경험, 케어 철학, 특기 등을 자유롭게 소개해 주세요.&#10;&#10;예) 저는 10년간 치매 어르신을 돌봐온 요양보호사입니다..."
                    rows={5}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none
                      focus:border-emerald-500 bg-gray-50 focus:bg-white transition resize-none"
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-gray-400">최소 50자 이상 입력해 주세요</p>
                    <span className={`text-xs font-semibold ${form.bio.length >= 50 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {form.bio.length}자
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: 근무 일정 */}
            {step === 4 && (
              <div key="p4" className={dir === 'fwd' ? 'step-fwd' : 'step-bwd'}>
                <p className="text-xs font-bold text-emerald-600 tracking-wide uppercase mb-1">4 / 4 단계</p>
                <h2 className="text-xl font-extrabold text-gray-900 mb-1">{currentStepInfo.desc}</h2>
                <p className="text-sm text-gray-400 mb-5">근무 가능한 요일과 시간대를 선택해 주세요</p>

                <div className="bg-gray-50 rounded-2xl p-4 mb-5">
                  <p className="text-xs text-gray-500 mb-3 font-medium">{tAvail('subtitle')}</p>
                  <AvailabilityGrid availability={availability} editable onChange={setAvailability} />
                </div>

                {/* 구직 중 토글 */}
                <div className="flex items-center justify-between bg-white border-2 border-gray-200 rounded-2xl px-4 py-4 mb-5">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">현재 구직 중</p>
                    <p className="text-xs text-gray-400 mt-0.5">켜두면 가족들에게 프로필이 검색돼요</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, available: !f.available }))}
                    className={`w-12 h-6 rounded-full transition-all duration-300 relative
                      ${form.available ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300
                      ${form.available ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {message && (
                  <div className={`rounded-2xl px-4 py-3 text-sm mb-4 fade-up font-medium
                    ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    {message.text}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base
                    hover:bg-emerald-700 active:scale-[0.98] transition disabled:opacity-50
                    flex items-center justify-center gap-2">
                  {saving
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 저장 중...</>
                    : '프로필 저장하기'
                  }
                </button>
              </div>
            )}

            {/* 에러 메시지 */}
            {stepErrors[step] && (
              <p className="text-sm text-red-500 mt-3 fade-up font-medium">{stepErrors[step]}</p>
            )}

            {/* 하단 버튼 */}
            <div className={`flex gap-3 mt-5 ${step === 1 ? 'justify-end' : 'justify-between'}`}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={goPrev}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700
                    px-4 py-2.5 rounded-2xl border-2 border-gray-200 hover:border-gray-300 transition font-medium">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  이전
                </button>
              )}
              {step < 4 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-bold text-sm
                    hover:bg-emerald-700 active:scale-[0.98] transition flex items-center justify-center gap-1.5">
                  다음
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l4 4-4 4" stroke="white" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
