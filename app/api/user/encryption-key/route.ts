import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

/**
 * GET /api/user/encryption-key
 *
 * Returns the per-user AES encryption key stored in user_profiles.
 * Requires a valid Bearer token (same token the extension already sends).
 *
 * Response: { encryptionKey: string }
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json(
      { error: 'No token provided' },
      { status: 401, headers: corsHeaders }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Validate the token and get the user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401, headers: corsHeaders }
    )
  }

  // Fetch the encryption key from user_profiles
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('encryption_key')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('[encryption-key] Profile lookup error:', profileError)
    return NextResponse.json(
      { error: 'Failed to retrieve encryption key' },
      { status: 500, headers: corsHeaders }
    )
  }

  // If the user somehow has no key (created before migration 010),
  // generate one now and persist it.
  let encryptionKey = profile?.encryption_key
  if (!encryptionKey) {
    const { data: generated, error: rpcError } = await supabase.rpc('generate_encryption_key_for_user', {
      p_user_id: user.id
    })

    if (rpcError) {
      // Fallback: generate in JS and write with service client
      const crypto = await import('crypto')
      encryptionKey = crypto.randomBytes(32).toString('hex')
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ encryption_key: encryptionKey })
        .eq('id', user.id)

      if (updateError) {
        console.error('[encryption-key] Failed to backfill key:', updateError)
        return NextResponse.json(
          { error: 'Failed to generate encryption key' },
          { status: 500, headers: corsHeaders }
        )
      }
    } else {
      // rpc returned the key
      encryptionKey = generated
    }
  }

  return NextResponse.json(
    { encryptionKey },
    { headers: corsHeaders }
  )
}
