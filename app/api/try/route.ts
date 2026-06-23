import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getVideoMeta, getTranscript, extractWithClaude, cardToHtml } from '@/lib/digest-pipeline'
import { EXTRACTION_PROMPT_DESIGNERS, EXTRACTION_PROMPT_BUILDERS, EXTRACTION_PROMPT_GENERAL, getExtractionPromptForGoal } from '@/lib/extraction-prompt'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Niche = 'designers' | 'builders' | 'general'

const PROMPT_BY_NICHE: Record<Niche, string> = {
  designers: EXTRACTION_PROMPT_DESIGNERS,
  builders: EXTRACTION_PROMPT_BUILDERS,
  general: EXTRACTION_PROMPT_GENERAL,
}

function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )
  return match ? match[1] : null
}

export async function POST(req: Request) {
  const body = await req.json()
  const { videoUrl, token } = body as { videoUrl: string; token: string }

  if (!videoUrl?.trim()) {
    return NextResponse.json({ error: 'A YouTube video URL is required.' }, { status: 400 })
  }

  if (!token) {
    return NextResponse.json({ error: 'Session token is required.' }, { status: 400 })
  }

  // Look up session
  const { data: session, error: sessionError } = await supabase
    .from('try_sessions')
    .select('token, niche, goal, try_count')
    .eq('token', token)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
  }

  if (session.try_count >= 3) {
    return NextResponse.json({ error: 'limit_reached' }, { status: 403 })
  }

  // Increment try_count
  const newCount = session.try_count + 1
  await supabase
    .from('try_sessions')
    .update({ try_count: newCount })
    .eq('token', token)

  // Notify when tester hits their last try
  if (newCount >= 3) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const name = (session as { email?: string }).email ?? 'Unknown'
      const identifier = (session as { goal?: string }).goal
        ? `goal: "${(session as { goal: string }).goal}"`
        : `niche: ${session.niche ?? 'unknown'}`
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: 'elliot.roberts@gmail.com',
        subject: `Digestt — tester limit reached`,
        text: `${name} (${identifier}) has used all 3 tries.`,
      })
    } catch (err) {
      console.error('limit-reached email error:', err)
    }
  }

  const videoId = extractVideoId(videoUrl.trim())
  if (!videoId) {
    return NextResponse.json({ error: "That doesn't look like a valid YouTube video URL." }, { status: 400 })
  }

  // Fetch video metadata
  const metaResult = await getVideoMeta(videoId)
  if (!metaResult.ok) {
    return NextResponse.json({ error: "Couldn't find that video. Check the URL and try again." }, { status: 404 })
  }
  const { title: videoTitle, channelName } = metaResult.meta

  // Fetch transcript
  const transcriptResult = await getTranscript(videoId)
  if (!transcriptResult.ok) {
    const msg = transcriptResult.reason === 'no-transcript'
      ? 'No transcript available for this video. Try one with captions enabled.'
      : 'Failed to fetch the transcript. Please try again.'
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  // Select prompt based on goal (new) or niche (existing)
  const niche = session.niche as Niche
  const prompt = (session as { goal?: string }).goal
    ? getExtractionPromptForGoal((session as { goal: string }).goal)
    : (PROMPT_BY_NICHE[niche] ?? EXTRACTION_PROMPT_BUILDERS)

  // Run extraction
  let card: string
  try {
    card = await extractWithClaude(transcriptResult.text, channelName, videoTitle, prompt)
  } catch (err) {
    console.error('extractWithClaude failed:', err)
    return NextResponse.json({ error: 'Extraction failed. Please try again.' }, { status: 500 })
  }

  console.log('[try] niche:', niche, '| card length:', card.length, '| preview:', card.slice(0, 300))

  return NextResponse.json({
    videoId,
    videoTitle,
    channelName,
    cardHtml: cardToHtml(card),
  })
}
