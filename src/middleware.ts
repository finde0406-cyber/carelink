import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const intlMiddleware = createMiddleware(routing)

export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request)

  // Supabase auth check for protected routes
  const pathname = request.nextUrl.pathname
  const protectedPattern = /^\/(ko|en|zh|ja)\/(dashboard|search|caregivers)/

  if (protectedPattern.test(pathname)) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    const locale = pathname.split('/')[1]
    if (!user) {
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
