import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hybridSearchChunks } from '../../../../lib/rag-search'

const INSIGHT_QUERIES = [
  {
    type: 'friction',
    title: 'Friction & Breakages',
    query: 'bug broken error not working failed crash exception',
    summaryTemplate: (count: number) =>
      `Found ${count} conversation${count !== 1 ? 's' : ''} where things broke or didn't work as expected.`,
  },
  {
    type: 'ai_errors',
    title: 'AI Mistakes & Corrections',
    query: "wrong incorrect mistake actually no that's not right try again",
    summaryTemplate: (count: number) =>
      `${count} conversation${count !== 1 ? 's' : ''} where you had to correct the AI.`,
  },
  {
    type: 'rework',
    title: 'Rework Sessions',
    query: 'redo rewrite start again rework refactor completely different approach',
    summaryTemplate: (count: number) =>
      `${count} conversation${count !== 1 ? 's' : ''} involved significant rework or starting over.`,
  },
  {
    type: 'breakthroughs',
    title: 'Breakthroughs',
    query: 'finally works solved it figured out that worked perfect exactly right',
    summaryTemplate: (count: number) =>
      `${count} conversation${count !== 1 ? 's' : ''} ended with a clear breakthrough or solution.`,
  },
  {
    type: 'recurring',
    title: 'Recurring Problems',
    query: 'same issue again still not working keeps happening this again recurring',
    summaryTemplate: (count: number) =>
      `${count} conversation${count !== 1 ? 's' : ''} suggest recurring or unresolved problems.`,
  },
]

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getUserSupabase(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

async function getUser(request: NextRequest, supabase: any) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const user = await getUser(request, supabase)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
        const userSupabase = getUserSupabase(token)

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    const tier = profile?.subscription_tier ?? 'free'
    if (tier === 'free') {
      return NextResponse.json(
        { error: 'AI Insights requires a Starter plan or above.', upgrade_required: true },
        { status: 402 }
      )
    }

    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, title')
      .eq('user_id', user.id)
      .eq('has_embeddings', true)
      .gte('message_count', 6)
      .limit(100)

    if (convError) throw convError

    if (!conversations || conversations.length === 0) {
      return NextResponse.json(
        { error: 'No indexed conversations found. Wait for your conversations to finish indexing.' },
        { status: 400 }
      )
    }

    const conversationIds = conversations.map((c: any) => c.id)
    const titleMap = new Map(conversations.map((c: any) => [c.id, c.title]))

    const results = await Promise.allSettled(
      INSIGHT_QUERIES.map(async (insight) => {
       const chunks = await hybridSearchChunks(userSupabase, insight.query, conversationIds, {
          matchThreshold: 0.55,
          matchCount: 20,
          rerankTopN: 10,
        })
        // Require 2+ matching chunks per conversation to reduce false positives
        const convChunkCounts = new Map<string, number>()
        chunks.forEach((c: any) => {
          convChunkCounts.set(c.conversation_id, (convChunkCounts.get(c.conversation_id) || 0) + 1)
        })
        const uniqueConvIds = [...convChunkCounts.entries()]
          .filter(([_, count]) => count >= 2)
          .map(([id]) => id)
        const count = uniqueConvIds.length
        const sampleItems = uniqueConvIds
          .slice(0, 3)
          .map((id) => titleMap.get(id) ?? 'Untitled')

        return {
          insight_type: insight.type,
          title: insight.title,
          summary: insight.summaryTemplate(count),
          count,
          sample_items: sampleItems,
        }
      })
    )

    const insightRows = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => ({
        ...(r as PromiseFulfilledResult<any>).value,
        user_id: user.id,
        generated_at: new Date().toISOString(),
      }))

    const { error: upsertError } = await supabase
      .from('user_insights')
      .upsert(insightRows, { onConflict: 'user_id,insight_type' })

    if (upsertError) throw upsertError

    return NextResponse.json({ insights: insightRows, generated_at: new Date().toISOString() })
  } catch (err: any) {
    console.error('Insights generation error:', err)
    return NextResponse.json({ error: err.message || 'Failed to generate insights' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const user = await getUser(request, supabase)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('user_insights')
      .select('*')
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ insights: data || [], generated_at: data?.[0]?.generated_at ?? null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}