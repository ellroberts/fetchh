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
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json(
      { valid: false, error: 'No token provided' },
      { status: 401, headers: corsHeaders }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return NextResponse.json(
      { valid: false, error: 'Invalid or expired token' },
      { status: 401, headers: corsHeaders }
    )
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('encryption_key')
    .eq('id', user.id)
    .single()

  return NextResponse.json(
    {
      valid: true,
      userId: user.id,
      email: user.email,
      encryptionKey: profile?.encryption_key || null,
    },
    { headers: corsHeaders }
  )
}