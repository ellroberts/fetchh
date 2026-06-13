// app/auth/callback/route.ts
import { createClient } from '../../../lib/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')

  const supabase = await createClient()

  let user = null

  // Email confirmation flow (token_hash + type=email)
  if (token_hash && type === 'email') {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type: 'email' })
    if (error || !data?.user) {
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=auth_failed`)
    }
    user = data.user
  }

  // OAuth / magic link flow (code)
  else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data?.session) {
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=auth_failed`)
    }
    // Password recovery — skip waitlist
    if (type === 'recovery') {
      return NextResponse.redirect(`${requestUrl.origin}/auth/update-password`)
    }
    user = data.session.user
  }

  else {
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=no_code`)
  }

  // Check waitlist status
  const { data: waitlistEntry } = await supabase
    .from('waitlist')
    .select('status, user_id')
    .eq('email', user.email)
    .single()

  // Link user_id if missing
  if (waitlistEntry && !waitlistEntry.user_id) {
    await supabase
      .from('waitlist')
      .update({ user_id: user.id })
      .eq('email', user.email)
  }

  // No waitlist entry — auto-approve new signups
  if (!waitlistEntry) {
    await supabase.from('waitlist').insert({
      email: user.email,
      user_id: user.id,
      status: 'approved',
      source: 'sign-up',
    })
  }

  // Ensure user_profiles row exists
  await supabase.from('user_profiles').upsert({
    id: user.id,
    subscription_tier: 'free',
    rag_queries_this_period: 0,
    rag_period_start: new Date().toISOString(),
  }, { onConflict: 'id', ignoreDuplicates: true })

  // Route based on status — new users (no prior entry) are auto-approved above
  const approved = !waitlistEntry || waitlistEntry.status === 'approved'
  if (approved) {
    return NextResponse.redirect(`${requestUrl.origin}${requestUrl.searchParams.get("from") === "extension" ? "/auth/extension-callback" : "/dashboard"}`)
  }

  return NextResponse.redirect(`${requestUrl.origin}/waitlist-pending`)
}