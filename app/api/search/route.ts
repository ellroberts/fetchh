import { createClient } from '@/lib/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET(req: NextRequest) {
  try {
    let user: any = null
    let supabase: any

    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: { user: bearerUser }, error } = await serviceClient.auth.getUser(token)
      if (!error && bearerUser) {
        user = bearerUser
        supabase = serviceClient
      }
    }

    if (!user) {
      supabase = await createClient()
      const { data: { user: cookieUser } } = await supabase.auth.getUser()
      user = cookieUser
    }

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''

    if (!query.trim()) {
      return NextResponse.json({ results: [] })
    }

    // Generate embedding for the query
    let queryEmbedding: number[] | null = null
    try {
      if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: query,
      })
      queryEmbedding = embeddingResponse.data[0].embedding
    } catch (e) {
      console.warn('Embedding generation failed, falling back to keyword search:', e)
    }

    let results

    if (queryEmbedding) {
      // Hybrid search via the database function
      const { data, error } = await supabase.rpc('search_conversations', {
        query_embedding: queryEmbedding,
        query_text: query,
        match_user_id: user.id,
        match_count: 20,
      })
      if (error) throw error
      results = data
    } else {
      // Fallback: keyword only
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, summary, platform, created_at, is_pinned')
        .eq('user_id', user.id)
        .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
        .limit(20)
      if (error) throw error
      results = data
    }

    // Enrich results with is_pinned (RPC path may not return it)
    if (results && results.length > 0 && !results[0].hasOwnProperty('is_pinned')) {
      const ids = results.map((r: { id: string }) => r.id)
      const { data: pinData } = await supabase
        .from('conversations')
        .select('id, is_pinned')
        .in('id', ids)
      if (pinData) {
        const pinMap: Record<string, boolean> = {}
        pinData.forEach((p: { id: string; is_pinned: boolean }) => { pinMap[p.id] = p.is_pinned })
        results = results.map((r: { id: string }) => ({ ...r, is_pinned: pinMap[r.id] ?? false }))
      }
    }

    // Also search projects (keyword only — no embeddings needed)
    const { data: projectResults } = await supabase
      .from('projects')
      .select('id, name, description, created_at')
      .eq('user_id', user.id)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(5)

    return NextResponse.json({ results, projects: projectResults || [] })
  } catch (err: any) {
    console.error('Search error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}