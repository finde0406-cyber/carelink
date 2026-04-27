'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-emerald-700">
          Care<span className="text-amber-400">Link</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/search" className="hover:text-emerald-700 transition">Find Caregivers</Link>
          <Link href="/caregivers" className="hover:text-emerald-700 transition">For Caregivers</Link>
          <Link href="/auth/login" className="hover:text-emerald-700 transition">Sign In</Link>
          <Link href="/auth/signup"
            className="bg-emerald-700 text-white px-5 py-2 rounded-full hover:bg-emerald-800 transition">
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          <div className="w-5 h-0.5 bg-gray-700 mb-1" />
          <div className="w-5 h-0.5 bg-gray-700 mb-1" />
          <div className="w-5 h-0.5 bg-gray-700" />
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4 text-sm font-medium text-gray-700">
          <Link href="/search" onClick={() => setMenuOpen(false)}>Find Caregivers</Link>
          <Link href="/caregivers" onClick={() => setMenuOpen(false)}>For Caregivers</Link>
          <Link href="/auth/login" onClick={() => setMenuOpen(false)}>Sign In</Link>
          <Link href="/auth/signup"
            className="bg-emerald-700 text-white text-center px-5 py-2 rounded-full"
            onClick={() => setMenuOpen(false)}>
            Get Started
          </Link>
        </div>
      )}
    </nav>
  )
}
