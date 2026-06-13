// app/api/mcp/route.ts
// Hosted MCP endpoint — implements MCP Streamable HTTP / JSON-RPC 2.0
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ─── Tool definitions (mirrored from mcp-server/index.js) ─────────────────────

const TOOLS = [
  {
    name: 'save_conversation',
    description: 'Save the current conversation to ThreadCub',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title for the conversation' },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string' },
              content: { type: 'string' },
            },
            required: ['role', 'content'],
          },
          description: 'Array of conversation messages',
        },
        platform: {
          type: 'string',
          description: 'Platform identifier',
          default: 'claude',
        },
      },
      required: ['title', 'messages'],
    },
  },
  {
    name: 'save_highlight',
    description: 'Save a highlight or excerpt to ThreadCub',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The text to highlight' },
        source_title: { type: 'string', description: 'Title of the source' },
        notes: { type: 'string', description: 'Optional notes' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags',
        },
        conversation_id: { type: 'string', description: 'Optional ID of the conversation this highlight belongs to' },
      },
      required: ['text'],
    },
  },
  {
    name: 'search_history',
    description: 'Search your ThreadCub conversation history',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_highlights',
    description: 'Get your saved highlights from ThreadCub',
    inputSchema: {
      type: 'object',
      properties: {
        conversation_id: {
          type: 'string',
          description: 'Optional conversation ID to filter highlights',
        },
      },
    },
  },
  {
    name: 'save_action',
    description: 'Save an action item to ThreadCub',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The action item text' },
        notes: { type: 'string', description: 'Additional notes' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags',
        },
        conversation_id: { type: 'string', description: 'Optional ID of the conversation this action belongs to' },
      },
      required: ['text'],
    },
  },
  {
    name: 'save_reminder',
    description: 'Save a reminder to ThreadCub',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The reminder text' },
        notes: { type: 'string', description: 'Additional notes' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags',
        },
        conversation_id: { type: 'string', description: 'Optional ID of the conversation this reminder belongs to' },
      },
      required: ['text'],
    },
  },
  {
    name: 'get_context',
    description: 'Search ThreadCub history and return relevant context for the current topic',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'The topic or subject to find context for' },
      },
      required: ['topic'],
    },
  },
]

// ─── Auth ──────────────────────────────────────────────────────────────────────

async function resolveApiKey(request: Request): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization')
  const key = authHeader?.replace('Bearer ', '').trim()
  if (!key) return null

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id')
    .eq('key_value', key)
    .maybeSingle()

  if (error || !data) return null

  // Update last_used_at without blocking the response
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})

  return { userId: data.user_id }
}

// ─── Tool execution ────────────────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, unknown>, userId: string): Promise<string> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  if (name === 'save_conversation') {
    const { title, messages, platform = 'claude' } = args as {
      title: string
      messages: { role: string; content: string }[]
      platform?: string
    }
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title,
        content: { messages },
        platform,
        message_count: messages.length,
        source: 'mcp',
        capture_method: 'mcp',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return `Conversation saved. ID: ${data.id}`
  }

  if (name === 'save_highlight') {
    const { text, source_title, notes, tags, conversation_id } = args as {
      text: string
      source_title?: string
      notes?: string
      tags?: string[]
      conversation_id?: string
    }
    const { data, error } = await supabase
      .from('highlights')
      .insert({
        user_id: userId,
        highlighted_text: text,
        source_url: 'claude://desktop',
        source_platform: 'claude',
        source_title: source_title ?? null,
        notes: notes ?? '',
        tags: tags ?? [],
        conversation_id: conversation_id ?? null,
        is_archived: false,
        is_pinned: false,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return `Highlight saved. ID: ${data.id}`
  }

  if (name === 'save_action') {
    const { text, notes, tags, conversation_id } = args as {
      text: string
      notes?: string
      tags?: string[]
      conversation_id?: string
    }
    const { data, error } = await supabase
      .from('action_items')
      .insert({
        user_id: userId,
        title: text,
        detail: notes ?? '',
        tags: tags ?? [],
        source_conversation_ids: conversation_id ? [conversation_id] : [],
        status: 'open',
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return `Action item saved. ID: ${data.id}`
  }

  if (name === 'save_reminder') {
    const { text, notes, tags, conversation_id } = args as {
      text: string
      notes?: string
      tags?: string[]
      conversation_id?: string
    }
    const { data, error } = await supabase
      .from('reminder_items')
      .insert({
        user_id: userId,
        title: text,
        detail: notes ?? '',
        tags: tags ?? [],
        source_conversation_ids: conversation_id ? [conversation_id] : [],
        status: 'open',
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return `Reminder saved. ID: ${data.id}`
  }

  if (name === 'get_highlights') {
    const { conversation_id } = (args ?? {}) as { conversation_id?: string }
    let query = supabase
      .from('highlights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (conversation_id) {
      query = query.eq('conversation_id', conversation_id)
    }
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return JSON.stringify(data ?? [])
  }

  if (name === 'search_history') {
    const { query } = args as { query: string }
    if (!query.trim()) return JSON.stringify([])

    let queryEmbedding: number[] | null = null
    try {
      if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: query,
      })
      queryEmbedding = embeddingResponse.data[0].embedding
    } catch {
      // fall through to keyword search
    }

    if (queryEmbedding) {
      const { data, error } = await supabase.rpc('search_conversations', {
        query_embedding: queryEmbedding,
        query_text: query,
        match_user_id: userId,
        match_count: 20,
      })
      if (error) throw new Error(error.message)
      return JSON.stringify(data ?? [])
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, summary, platform, created_at, is_pinned')
      .eq('user_id', userId)
      .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
      .limit(20)
    if (error) throw new Error(error.message)
    return JSON.stringify(data ?? [])
  }

  if (name === 'get_context') {
    const { topic } = args as { topic: string }
    if (!topic.trim()) return 'Relevant context from your ThreadCub history:\n\nNo results found.'

    let queryEmbedding: number[] | null = null
    try {
      if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: topic,
      })
      queryEmbedding = embeddingResponse.data[0].embedding
    } catch {
      // fall through to keyword search
    }

    let results: Record<string, unknown>[]
    if (queryEmbedding) {
      const { data, error } = await supabase.rpc('search_conversations', {
        query_embedding: queryEmbedding,
        query_text: topic,
        match_user_id: userId,
        match_count: 20,
      })
      if (error) throw new Error(error.message)
      results = data ?? []
    } else {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, summary, platform, created_at, is_pinned')
        .eq('user_id', userId)
        .or(`title.ilike.%${topic}%,summary.ilike.%${topic}%`)
        .limit(20)
      if (error) throw new Error(error.message)
      results = data ?? []
    }

    const formatted = results.slice(0, 5)
      .map((r, i) => {
        const snippet = typeof r.summary === 'string' ? r.summary.slice(0, 200) : ''
        return `${i + 1}. ${r.title ?? 'Untitled'} [${r.platform ?? 'unknown'}]\n   ${snippet}`
      })
      .join('\n\n')
    return `Relevant context from your ThreadCub history:\n\n${formatted || 'No results found.'}`
  }

  throw new Error(`Unknown tool: ${name}`)
}

// ─── JSON-RPC helpers ──────────────────────────────────────────────────────────

function jsonRpc(id: unknown, result: unknown) {
  return NextResponse.json(
    { jsonrpc: '2.0', id, result },
    { headers: corsHeaders }
  )
}

function jsonRpcError(id: unknown, message: string, code = -32603) {
  return NextResponse.json(
    { jsonrpc: '2.0', id, error: { code, message } },
    { headers: corsHeaders }
  )
}

// ─── Route handlers ────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function GET() {
  return new NextResponse(null, { status: 405, headers: corsHeaders })
}

export async function POST(request: Request) {
  const auth = await resolveApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
  }

  let body: { jsonrpc: string; id?: unknown; method: string; params?: unknown }
  try {
    body = await request.json()
  } catch {
    return jsonRpcError(null, 'Parse error', -32700)
  }

  const { id = null, method, params } = body

  if (method === 'initialize') {
    return jsonRpc(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'threadcub', version: '1.0.0' },
    })
  }

  if (method === 'notifications/initialized') {
    return new NextResponse(null, { status: 202, headers: corsHeaders })
  }

  if (method === 'tools/list') {
    return jsonRpc(id, { tools: TOOLS })
  }

  if (method === 'tools/call') {
    const { name, arguments: toolArgs } = (params ?? {}) as { name: string; arguments: Record<string, unknown> }
    try {
      const text = await executeTool(name, toolArgs ?? {}, auth.userId)
      return jsonRpc(id, { content: [{ type: 'text', text }] })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return jsonRpcError(id, message)
    }
  }

  return jsonRpcError(id, `Method not found: ${method}`, -32601)
}
