// proxy.ts (previously middleware.ts — renamed for Next.js 16 compatibility)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Public routes — never redirect
const PUBLIC_PATHS = new Set([
  '/',
  '/privacy',
  '/terms',
  '/welcome',
  '/login',
  '/waitlist-pending',       // ← holding page for pending users
  '/auth',
  '/auth/callback',
  '/auth/confirm',
  '/auth/reset-password',
  '/auth/update-password',
  '/auth/extension-login',
  '/auth/extension-callback',
  '/auth/confirm-error',
  '/favicon.ico',
])

// Only guard these prefixes
const PROTECTED_PREFIXES = ['/dashboard', '/conversations', '/threads', '/settings', '/projects', '/highlights', '/import', '/admin']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Redirect non-www to www
  const host = req.headers.get('host') || ''
  if (host === 'threadcub.com') {
    const url = req.nextUrl.clone()
    url.host = 'www.threadcub.com'
    return NextResponse.redirect(url, { status: 301 })
  }
  const res = NextResponse.next()

  // Allow Next.js internals & static assets
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return res
  }

  // Allow explicit public routes (and all /auth/* sub-paths)
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith('/auth/')) {
    return res
  }

  // Only run checks on protected areas
  if (!PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return res
  }

  // Build a Supabase server client that can read/write cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Not logged in → send to auth
  if (!user) {
    const url = req.nextUrl.clone()
    url.pathname = '/auth'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Authenticated — waitlist approval is checked client-side by the dashboard layout
  // (server-side anon key queries are subject to RLS and cannot reliably read the waitlist table)
  return res
}

export const config = {
  matcher: ['/((?!_next/|api/|.*\\..*).*)'],
}