import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getVideoMeta, getTranscript, extractWithClaude, cardToHtml } from '@/lib/digest-pipeline'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )
  return match ? match[1] : null
}

export async function POST(req: Request) {
  const body = await req.json()
  const { email, videoUrl } = body as { email: string; videoUrl: string }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  if (!videoUrl?.trim()) {
    return NextResponse.json({ error: 'A YouTube video URL is required.' }, { status: 400 })
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

  // Run extraction
  let card: string
  try {
    card = await extractWithClaude(transcriptResult.text, channelName, videoTitle)
  } catch (err) {
    console.error('extractWithClaude failed:', err)
    return NextResponse.json({ error: 'Extraction failed. Please try again.' }, { status: 500 })
  }

  // Upsert email as lead capture (ignore conflict on email)
  await supabase
    .from('digest_signups')
    .upsert({ email: email.trim().toLowerCase(), channels: [] }, { onConflict: 'email', ignoreDuplicates: true })

  return NextResponse.json({
    videoId,
    videoTitle,
    channelName,
    cardHtml: cardToHtml(card),
  })
}
