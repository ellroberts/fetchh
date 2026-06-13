// JavaScript version for app/api/claude/route.js
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { messages, max_tokens = 1024 } = body

    // Debug logging
    console.log('🔍 Claude API Debug:')
    console.log('- Request received:', { messageCount: messages?.length, max_tokens })
    console.log('- API Key exists:', !!process.env.ANTHROPIC_API_KEY)
    console.log('- API Key length:', process.env.ANTHROPIC_API_KEY?.length || 0)

    // Check if API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY not found in environment variables')
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured. Please add it to your .env.local file.' },
        { status: 500 }
      )
    }

    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('❌ Invalid messages format')
      return NextResponse.json(
        { error: 'Messages array is required and cannot be empty' },
        { status: 400 }
      )
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', // Using Claude Sonnet 4
        max_tokens: max_tokens,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      }),
    })

    console.log('📡 Anthropic Response Status:', anthropicResponse.status)
    console.log('📡 Anthropic Response Headers:', Object.fromEntries(anthropicResponse.headers.entries()))

    const responseData = await anthropicResponse.text()
    console.log('📡 Raw Anthropic Response:', responseData.substring(0, 200) + '...')

    if (!anthropicResponse.ok) {
      console.error('❌ Anthropic API Error:', {
        status: anthropicResponse.status,
        statusText: anthropicResponse.statusText,
        response: responseData
      })

      // Handle specific error codes
      if (anthropicResponse.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait a moment and try again.' },
          { status: 429 }
        )
      } else if (anthropicResponse.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key. Please check your ANTHROPIC_API_KEY.' },
          { status: 401 }
        )
      } else if (anthropicResponse.status === 400) {
        return NextResponse.json(
          { error: `Bad request: ${responseData}` },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: `Anthropic API error: ${anthropicResponse.status} ${responseData}` },
        { status: anthropicResponse.status }
      )
    }

    const data = JSON.parse(responseData)
    console.log('✅ Anthropic Success:', { 
      usage: data.usage,
      contentLength: data.content?.[0]?.text?.length 
    })

    return NextResponse.json({
      content: data.content[0].text,
      usage: data.usage
    })

  } catch (error) {
    console.error('💥 Claude API Route Error:', error)
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    )
  }
}