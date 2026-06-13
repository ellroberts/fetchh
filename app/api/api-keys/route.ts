// app/api/api-keys/route.ts
// GET    — return the current user's API key (if any)
// POST   — generate (or regenerate) an API key
// DELETE — delete the current user's API key
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function resolveUser(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function GET(request: Request) {
  const user = await resolveUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, key_value, name, created_at, last_used_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch API key' }, { status: 500, headers: corsHeaders })
  }

  return NextResponse.json({ key: data ?? null }, { headers: corsHeaders })
}

export async function POST(request: Request) {
  const user = await resolveUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Delete any existing key for this user
  await supabase.from('api_keys').delete().eq('user_id', user.id)

  const keyValue = `tc_${randomHex(16)}`

  const { data, error } = await supabase
    .from('api_keys')
    .insert({ user_id: user.id, key_value: keyValue, name: 'Default' })
    .select('key_value')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500, headers: corsHeaders })
  }

  return NextResponse.json({ key_value: data.key_value }, { headers: corsHeaders })
}

export async function DELETE(request: Request) {
  const user = await resolveUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { error } = await supabase.from('api_keys').delete().eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500, headers: corsHeaders })
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders })
}
