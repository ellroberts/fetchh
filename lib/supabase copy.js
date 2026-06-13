import { createClient } from '@supabase/supabase-js'

// ✅ Required: Supabase environment variables must be defined at build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Missing Supabase environment variables. Check your .env.production setup.')
}

// 🐻 Optional: Debug output in the browser only
if (typeof window !== 'undefined') {
  console.log('🐻 Supabase Config:', {
    urlSet: !!supabaseUrl,
    keyLength: supabaseAnonKey.length,
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
