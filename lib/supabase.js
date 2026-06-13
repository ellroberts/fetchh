// lib/supabase.js
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Missing Supabase environment variables')
}

// SameSite=None;Secure is required for cookies to work inside cross-origin
// iframes (e.g. the Replit workspace preview pane). Without this, browsers
// block the auth session cookie and every page refresh logs the user out.
const COOKIE_OPTIONS = {
  sameSite: 'none',
  secure: true,
}

// Singleton browser Supabase client.
// createBrowserClient from @supabase/ssr always overrides auth.storage with
// its own cookie-based storage and forces persistSession: true, so the
// auth sub-options below are intentionally minimal.
let _client = null

export const createSupabaseClient = () => {
  if (_client) return _client
  _client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: COOKIE_OPTIONS,
  })
  return _client
}

// Legacy export for backwards compatibility
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: COOKIE_OPTIONS,
})
