import { NextResponse } from 'next/server'
import { getVideoMeta, getTranscript, extractWithClaude, cardToHtml } from '@/lib/digest-pipeline'
import { EXTRACTION_PROMPT_DESIGNERS, EXTRACTION_PROMPT_BUILDERS, EXTRACTION_PROMPT_GENERAL } from '@/lib/extraction-prompt'

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
  const { videoUrl, niche = 'designers' } = body as { videoUrl: string; niche?: Niche }

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

  // Select prompt based on niche
  const prompt = PROMPT_BY_NICHE[niche] ?? EXTRACTION_PROMPT_DESIGNERS

  // Run extraction
  let card: string
  try {
    card = await extractWithClaude(transcriptResult.text, channelName, videoTitle, prompt)
  } catch (err) {
    console.error('extractWithClaude failed:', err)
    return NextResponse.json({ error: 'Extraction failed. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({
    videoId,
    videoTitle,
    channelName,
    cardHtml: cardToHtml(card),
  })
}
