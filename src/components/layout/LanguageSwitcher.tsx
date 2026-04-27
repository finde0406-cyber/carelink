'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

const languages = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
]

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const current = languages.find(l => l.code === locale) || languages[0]

  function switchLocale(code: string) {
    const segments = pathname.split('/')
    segments[1] = code
    router.push(segments.join('/'))
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-600
          hover:text-gray-900 border border-gray-200 rounded-full px-3 py-1.5
          hover:border-gray-300 transition">
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <span className="text-gray-400 text-xs">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 bg-white border border-gray-200
            rounded-xl shadow-lg py-1 min-w-[130px]">
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => switchLocale(lang.code)}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2
                  hover:bg-gray-50 transition
                  ${locale === lang.code ? 'text-emerald-700 font-semibold' : 'text-gray-700'}`}>
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
