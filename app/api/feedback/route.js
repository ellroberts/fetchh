import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { type, rating, comment, canContact } = await request.json()

    if (!type) {
      return NextResponse.json({ error: 'Type is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('extension_feedback')
      .insert({
        type,
        rating: rating ? parseInt(rating) : null,
        comment: comment || null,
        can_contact: canContact || false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Feedback route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
