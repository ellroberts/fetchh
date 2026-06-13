// app/api/chat/multi-analyze/route.ts
// RAG-based multi-conversation analysis endpoint — tier-based access

import { createClient } from '../../../../lib/utils/supabase/server'
import { NextResponse } from 'next/server'
import {
  hybridSearchChunks,
  buildContextFromChunks,
  buildSourceCitations,
  getConversationTitles,
  verifyEmbeddingsReady,
  saveRagChatSession,
  loadRagChatSession,
  trimContextToTokenBudget,
} from '../../../../lib/rag-search'
import { generateEmbedding } from '../../../../lib/rag-embeddings'
import { DEFAULT_EMBEDDING_MODEL, VectorSearchResult } from '../../../../lib/rag-types'
import {
  DEFAULT_SIMILARITY_THRESHOLD,
  DEFAULT_MAX_CHUNKS,
  RagChatMessage,
} from '../../../../lib/rag-types'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

// ── Tier definitions (RAG queries per month) ──────────────────────────────────
const TIER_RAG_LIMITS: Record<string, number> = {
  free: 0,
  starter: 150,
  pro: 400,
  unlimited: 800,
}

function getRagQueryLimit(tier: string): number {
  return TIER_RAG_LIMITS[tier] ?? TIER_RAG_LIMITS.free
}
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const {
      conversation_ids,
      library_doc_ids,
      question,
      session_id,
      project_name,
      project_id,
      max_chunks = DEFAULT_MAX_CHUNKS,
      similarity_threshold = DEFAULT_SIMILARITY_THRESHOLD,
    } = await request.json()

    console.log('🚀 Starting multi-chat RAG analysis')
    console.log('  - Question:', question)
    console.log('  - Conversation IDs:', conversation_ids)

    const isGlobalMode = !conversation_ids || !Array.isArray(conversation_ids) || conversation_ids.length === 0

    console.log('[multi-analyze] received:', {
      conversation_ids,
      isGlobalMode,
      conversation_ids_length: Array.isArray(conversation_ids) ? conversation_ids.length : 'not array'
    })

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 })
    }

    // ── Casual chat detection — skip RAG pipeline and tier consumption ─────
    // Classify upfront with a minimal Haiku call before touching Supabase or embeddings
    const casualCheckResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 5,
        system: 'Classify the message. Reply with one word only: CASUAL if it is a greeting, small talk, or general chitchat with no intent to search saved conversations. Reply RAG if it is a question or request that requires searching saved conversations or documents.',
        messages: [{ role: 'user', content: question }],
      }),
    })
    if (casualCheckResponse.ok) {
      const casualCheckData = await casualCheckResponse.json()
      const classification = (casualCheckData.content[0]?.text ?? '').trim().toUpperCase()
      if (classification === 'CASUAL') {
        console.log('💬 Casual message detected — skipping RAG pipeline')
        const casualReplyResponse = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY || '',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 120,
            system: "You are Coda — a warm, curious little bear who lives inside ThreadCub. You are having a casual chat with the user. Keep it friendly, light, and brief — 1-2 sentences max. No bullet points, no feature lists. Just be yourself.",
            messages: [{ role: 'user', content: question }],
          }),
        })
        const casualReplyData = await casualReplyResponse.json()
        const casualAnswer = casualReplyData.content?.[0]?.text ?? "Hey! What's on your mind?"
        return NextResponse.json({
          answer: casualAnswer,
          caveat: null,
          action_item_added: { actions: 0, reminders: 0 },
          sources: [],
          session_id: null,
          chunks_retrieved: 0,
          conversation_count: 0,
        })
      }
    }
    // ── End casual chat detection ─────────────────────────────────────────────

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized - please sign in' }, { status: 401 })
    }

    console.log('✅ User authenticated:', user.id)

    // ── Fetch profile and check tier access ───────────────────────────────
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_tier, rag_queries_this_period, rag_period_start')
      .eq('id', user.id)
      .single()

    const userTier = profile?.subscription_tier ?? 'free'

    if (userTier === 'free') {
      return NextResponse.json(
        {
          error: 'Not available on free plan',
          tier: 'free',
          upgrade_required: true,
          message: 'Deep analysis and cross-conversation search require a Starter plan or above.',
        },
        { status: 402 }
      )
    }
    // ─────────────────────────────────────────────────────────────────────

    // ── Enforce monthly RAG query limit ───────────────────────────────────
    const { data: queryAllowed, error: tierError } = await supabase.rpc(
      'check_and_increment_rag_query',
      { p_user_id: user.id }
    )

    if (tierError) {
      console.error('❌ Tier check error:', tierError)
      return NextResponse.json({ error: 'Failed to verify query limit' }, { status: 500 })
    }

    if (!queryAllowed) {
      const periodStart = profile?.rag_period_start
        ? new Date(profile.rag_period_start)
        : new Date()
      const resetDate = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000)
      const resetFormatted = resetDate.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long',
      })

      const limit = getRagQueryLimit(userTier)

      return NextResponse.json(
        {
          error: 'Monthly query limit reached',
          tier: userTier,
          queries_used: profile?.rag_queries_this_period ?? 0,
          queries_limit: limit,
          reset_date: resetDate.toISOString(),
          message: `You've used all ${limit} AI queries included in your ${userTier} plan this month. Your allowance resets on ${resetFormatted}.`,
          upgrade_required: true,
        },
        { status: 402 }
      )
    }
    // ─────────────────────────────────────────────────────────────────────

    // ── Library mode: search library_embeddings instead of conversations ──
    const isLibraryMode = Array.isArray(library_doc_ids) && library_doc_ids.length > 0
    if (isLibraryMode) {
      const queryEmbedding = await generateEmbedding(question, DEFAULT_EMBEDDING_MODEL)
      const embeddingString = `[${queryEmbedding.join(',')}]`
      const { data: libChunks, error: libError } = await supabase.rpc('match_library_chunks', {
        query_embedding: embeddingString,
        library_doc_ids,
        match_threshold: similarity_threshold,
        match_count: max_chunks,
        requesting_user_id: user.id,
      })
      if (libError) throw new Error(`Library search failed: ${libError.message}`)
      const { data: docs } = await supabase
        .from('library_documents')
        .select('id, title')
        .in('id', library_doc_ids)
      const docTitles = new Map((docs || []).map((d: { id: string; title: string }) => [d.id, d.title]))
      const context = (libChunks || []).map((c: any) =>
        `[${docTitles.get(c.library_doc_id) || 'Document'}]\n${c.chunk_text}`
      ).join('\n\n---\n\n')
      const sources = (libChunks || []).map((c: any) => ({
        conversation_id: c.library_doc_id,
        title: docTitles.get(c.library_doc_id) || 'Document',
        chunk_text: c.chunk_text,
        similarity: c.similarity,
      }))
      let chatHistory: RagChatMessage[] = []
      if (session_id) {
        const existingSession = await loadRagChatSession(supabase, session_id, user.id)
        if (existingSession) chatHistory = existingSession.messages
      }
      const systemPrompt = `You are Coda — a curious, warm little bear who lives inside ThreadCub. The user is asking about their Library documents. Dig into the excerpts with your usual enthusiasm, answer concisely and directly, and if the answer isn't there, say so plainly.`
      const historyText = chatHistory.length > 0
        ? '\n\nPrevious conversation:\n' + chatHistory.slice(-6).map((m: RagChatMessage) => `${m.role === 'user' ? 'User' : 'Coda'}: ${m.content}`).join('\n')
        : ''
      const userPrompt = `Document excerpts:\n\n${context}${historyText}\n\nQuestion: ${question}`
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          messages: [{ role: 'user', content: userPrompt }],
          system: systemPrompt,
        }),
      })
      if (!response.ok) throw new Error(`Claude API error: ${response.status}`)
      const claudeResponse = await response.json()
      const answer = claudeResponse.content[0]?.text || 'Unable to generate response'
      const newUserMessage: RagChatMessage = { role: 'user', content: question, timestamp: new Date().toISOString() }
      const newAssistantMessage: RagChatMessage = { role: 'assistant', content: answer, timestamp: new Date().toISOString(), sources, caveat: null }
      chatHistory.push(newUserMessage, newAssistantMessage)
      const savedSessionId = await saveRagChatSession(supabase, user.id, session_id || null, library_doc_ids, chatHistory)
      return NextResponse.json({
        answer, caveat: null, action_item_added: { actions: 0, reminders: 0 },
        sources, session_id: savedSessionId,
        chunks_retrieved: (libChunks || []).length,
        conversation_count: library_doc_ids.length,
      })
    }
    // ── End library mode ────────────────────────────────────────────
    // Resolve conversation IDs
    let resolvedIds: string[] = isGlobalMode ? [] : conversation_ids
    if (isGlobalMode) {
      const { data: allIndexed, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('has_embeddings', true)
        .limit(50)

      if (fetchError) {
        return NextResponse.json({ error: 'Failed to load indexed conversations' }, { status: 500 })
      }

      resolvedIds = (allIndexed || []).map((r: { id: string }) => r.id)

      if (resolvedIds.length === 0) {
        return NextResponse.json({
          answer: "Hey! I don't have any conversations to dig through yet, but once I do I'll be able to help you find patterns, recall decisions, and connect the dots across everything you've been talking about. Go save a few and come back!",
          caveat: null,
          action_item_added: { actions: 0, reminders: 0 },
          sources: [],
          session_id: null,
          chunks_retrieved: 0,
          conversation_count: 0,
        })
      }

      console.log(`🌍 Global mode: resolved ${resolvedIds.length} indexed conversations`)
    }

    const embeddingCheck = await verifyEmbeddingsReady(supabase, resolvedIds)
    if (!embeddingCheck.ready) {
      return NextResponse.json(
        {
          error: 'Some conversations do not have embeddings generated',
          missing_embeddings: embeddingCheck.missingIds,
        },
        { status: 400 }
      )
    }

    let chatHistory: RagChatMessage[] = []
    if (session_id) {
      const existingSession = await loadRagChatSession(supabase, session_id, user.id)
      if (existingSession) {
        chatHistory = existingSession.messages
      }
    }

    console.log(`🔍 Searching across ${resolvedIds.length} conversations for: "${question}"`)

    const searchResults = await hybridSearchChunks(supabase, question, resolvedIds, {
      matchThreshold: similarity_threshold,
      matchCount: max_chunks,
    })

    console.log(`📊 Found ${searchResults.length} relevant chunks`)

    const conversationTitles = await getConversationTitles(supabase, resolvedIds)
    const trimmedResults = trimContextToTokenBudget(searchResults, conversationTitles, 40000)
    const context = buildInterleavedContext(trimmedResults, conversationTitles)
    const sources = buildSourceCitations(trimmedResults, conversationTitles)

    const systemPrompt = buildSystemPrompt(resolvedIds.length, conversationTitles, isGlobalMode, project_name ?? null)
    const userPrompt = buildUserPrompt(question, context, chatHistory)

    console.log('🤖 Calling Claude API...')

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // Haiku — sufficient for RAG retrieval, ~20x cheaper than Sonnet
        max_tokens: 3500,
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Claude API error:', errorData)
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`)
    }

    const claudeResponse = await response.json()
    let answer = claudeResponse.content[0]?.text || 'Unable to generate response'

    console.log('✅ Got response from Claude')

    const uniqueConvCount = new Set(trimmedResults.map((r: { conversation_id: string }) => r.conversation_id)).size
    console.log('chunk count:', trimmedResults.length, 'unique conversations:', uniqueConvCount, 'caveat added:', uniqueConvCount < 3)
    const caveat = uniqueConvCount < 3
      ? `This answer is based on ${uniqueConvCount === 1 ? '1 conversation' : `${uniqueConvCount} conversations`} I have access to. There may be broader context across your other threads that I haven't seen.`
      : null

    // ── Action item detection (fire-and-forget, project-scoped only) ──────────
    const canDetectAction = !isGlobalMode && !!project_id
    console.log(`🔎 [ACTION] canDetectAction=${canDetectAction} | isGlobalMode=${isGlobalMode} | project_id=${project_id ?? '(none)'}`)
    const ZERO = { actions: 0, reminders: 0 }
    const actionDetectionPromise: Promise<{ actions: number; reminders: number }> = canDetectAction
      ? detectActionItems(supabase, user.id, project_id, answer, resolvedIds)
          .catch(err => { console.error('[ACTION] Detection threw an exception:', err); return ZERO })
      : Promise.resolve(ZERO)
    // ─────────────────────────────────────────────────────────────────────────

    const newUserMessage: RagChatMessage = {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    }

    const newAssistantMessage: RagChatMessage = {
      role: 'assistant',
      content: answer,
      timestamp: new Date().toISOString(),
      sources,
      caveat,
    }

    chatHistory.push(newUserMessage, newAssistantMessage)

    const savedSessionId = await saveRagChatSession(
      supabase,
      user.id,
      session_id || null,
      resolvedIds,
      chatHistory
    )

    console.log(`💾 Saved chat session: ${savedSessionId}`)

    // Race action detection with a 9-second window — Haiku typically finishes
    // well within this. Must complete before response so banner + events fire.
    const action_item_added = await Promise.race([
      actionDetectionPromise,
      new Promise<{ actions: number; reminders: number }>(resolve =>
        setTimeout(() => resolve({ actions: 0, reminders: 0 }), 9000)
      ),
    ])

    return NextResponse.json({
      answer,
      caveat,
      action_item_added,
      sources,
      session_id: savedSessionId,
      chunks_retrieved: trimmedResults.length,
      conversation_count: resolvedIds.length,
    })
  } catch (error: any) {
    console.error('Multi-chat analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze conversations' },
      { status: 500 }
    )
  }
}


function buildInterleavedContext(
  chunks: VectorSearchResult[],
  conversationTitles: Map<string, string>
): string {
  if (chunks.length === 0) return 'No relevant context found.';
  const sorted = [...chunks].sort((a, b) => b.similarity - a.similarity);
  return sorted.map(chunk => {
    const title = conversationTitles.get(chunk.conversation_id) || 'Unknown';
    return `[Source: "${title}"]
${chunk.chunk_text}`;
  }).join('\n\n---\n\n');
}
function buildSystemPrompt(
  conversationCount: number,
  conversationTitles: Map<string, string>,
  isGlobalMode: boolean = false,
  projectName: string | null = null
): string {
  const titleList = Array.from(conversationTitles.values()).join(', ')
  const scope = isGlobalMode
    ? `your entire ThreadCub library (${conversationCount} indexed conversation${conversationCount !== 1 ? 's' : ''})`
    : projectName
      ? `${conversationCount} conversation${conversationCount !== 1 ? 's' : ''} from the project "${projectName}": ${titleList}`
      : `${conversationCount} selected conversation${conversationCount !== 1 ? 's' : ''}: ${titleList}`

  return `You are Coda — a curious, warm little bear who lives inside ThreadCub and loves nothing more than nosing through conversations to find the gems buried inside them. You help users understand and reflect on conversations they had with other AI assistants. You have access to ${scope}.

You bring genuine enthusiasm to finding patterns, surfacing forgotten decisions, and connecting dots across threads. You're concise and direct — you don't waffle or pad — but you have personality. Think of yourself as a sharp, friendly research companion, not a search engine.

## Critical framing rules:
- You were NOT a participant in any of these conversations — they happened between the user and other AI tools (ChatGPT, Claude, etc.)
- NEVER say "you and I", "we discussed", "we explored", or any phrasing that implies you were involved
- ALWAYS attribute ideas to the user and the AI they were talking to at the time, e.g. "In your conversation about X, you explored...", "You and the assistant discussed...", "Across your threads, you worked through..."
- You are a reader and analyst of these conversations, not a participant in them

## How to respond based on question type:

**Synthesis questions** (themes, patterns, summaries, decisions, what was learned, what was agreed):
- Identify ALL distinct themes across the provided sources — do not focus only on the most frequently mentioned topics
- Actively look for ideas that appear in only one or two sources — these are often the most valuable insights
- Write in clear, scannable prose: one bold theme title per section, 2-3 specific points beneath it
- Use the user's own language, project names, and terminology from their conversations
- Distinguish between: decisions that were made, problems encountered, things still unresolved, and breakthroughs
- End every synthesis response with a single follow-up question: "Which of these areas would you like to explore further?"
- Aim for 4-7 sections — breadth matters as much as depth

**Factual questions** (specific details, code, dates, what was said):
- Answer directly and concisely — 2-4 sentences
- Cite the conversation title inline (e.g. "In 'Figma icon stroke control', ...")

**Rules for all responses:**
- Base answers strictly on the provided context — never invent or assume
- If something isn't in the context, say "I couldn't find that in your conversations"
- Never ask clarifying questions mid-response
- Never open with "Based on your conversations" or any variant — begin immediately with the first theme or insight
- For greetings, small talk, or messages with no clear question (e.g. "hello", "hi", "thanks"), respond in 1-2 sentences max — warm and brief, no lists, no feature explanations
- For synthesis responses, cover sources that appear only once in the context — do not skip them because they are less prominent`
}

function buildUserPrompt(
  question: string,
  context: string,
  chatHistory: RagChatMessage[]
): string {
  let prompt = ''

  if (chatHistory.length > 0) {
    const recentHistory = chatHistory.slice(-6)
    prompt += 'Previous conversation:\n'
    for (const msg of recentHistory) {
      prompt += msg.role === 'user' ? `User: ${msg.content}\n` : `Assistant: ${msg.content}\n`
    }
    prompt += '\n---\n\n'
  }

  // Detect synthesis questions to guide response style
  const synthesisKeywords = [
    'theme', 'themes', 'summary', 'summarise', 'summarize',
    'decision', 'decisions', 'pattern', 'patterns',
    'what did', 'what have', 'what was', 'overview', 'recap',
    'main', 'key', 'learned', 'agreed', 'covered',
    'review', 'across', 'everything', 'working on',
    'progress', 'status', 'update', 'tell me about',
  ]
  const workItemKeywords = [
    'work item', 'work items', 'task', 'tasks', 'action', 'actions',
    'explore further', 'should i', 'what should', 'priorities', 'priority',
    'next steps', 'next step', 'to do', 'todo', 'backlog', 'roadmap',
    'assess', 'evaluate', 'focus on', 'ship', 'build next',
  ]
  const isSynthesis = synthesisKeywords.some(kw => question.toLowerCase().includes(kw))
  const isWorkItems = workItemKeywords.some(kw => question.toLowerCase().includes(kw))

  prompt += `Context from conversations:\n${context}\n\n---\n\n`
  prompt += `Question: ${question}\n\n`

  if (isWorkItems) {
    prompt += `(This is a work items question. Respond in this exact format:\n- One sentence summarising the overarching theme across all conversations\n- Then 5-7 numbered sections, each with: a bold section title, one sentence of context, then exactly 2 bullet points each starting with "**Work Item:**" describing a specific, actionable task\n- End with: "Which of these areas would you like to drill into first?"\n- Keep each Work Item to 1-2 sentences. Be specific and actionable, not descriptive.)`
  } else if (isSynthesis) {
    prompt += `(This is a synthesis question — please reason across all the context and write a structured, narrative response with named themes or sections. Use the user's own terminology. Distinguish decisions made from problems encountered from things still unresolved.)`
  }

  return prompt
}

async function detectActionItems(
  supabase: Awaited<ReturnType<typeof import('../../../../lib/utils/supabase/server').createClient>>,
  userId: string,
  projectId: string,
  answer: string,
  conversationIds: string[],
): Promise<{ actions: number; reminders: number }> {
  console.log(`[ACTION] ① Starting Haiku detection call | projectId=${projectId} | userId=${userId}`)

  const prompt = `You are reviewing an AI-generated analysis of someone's conversation threads. Identify up to 3 clear, specific items the user should act on — concrete next steps or tasks — NOT general observations or insights. An action item must have a specific, fixable scope — for example "Fix the dedup logic in the save route for authenticated users" is an action item. "The codebase has accumulated technical debt" is not.

Classify each item as either "action" or "reminder":
- "action": a change to code, database, or configuration
- "reminder": a process step, workflow instruction, or recurring how-to the user keeps needing to look up
Process advice, debugging steps, and workflow reminders are not actions — classify these as reminders instead. Only code, database, or configuration changes are actions.

Analysis:
"""
${answer.slice(0, 6000)}
"""

If the analysis contains items, respond with ONLY valid JSON in this exact format:
[{"type":"action","title":"Short actionable title (max 10 words)","detail":"Full explanation of what to do and why, 2–4 sentences.","source_chunk":"The 1–2 sentence excerpt from the analysis that triggered this item."}]

If there are no clear items, respond with ONLY: []`

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  console.log(`[ACTION] ② Haiku response status: ${response.status} ${response.statusText}`)

  if (!response.ok) {
    const errBody = await response.text().catch(() => '(unreadable)')
    console.error(`[ACTION] ② Haiku call failed | status=${response.status} | body=${errBody}`)
    return { actions: 0, reminders: 0 }
  }

  const data = await response.json()
  const text = (data.content[0]?.text ?? '').trim()

  console.log(`[ACTION] ③ Raw Haiku output: "${text}"`)

  // Strip markdown code fences if present (e.g. ```json ... ``` or ``` ... ```)
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  if (stripped !== text) {
    console.log('[ACTION] ③ Stripped markdown code fences from output')
  }

  if (!stripped || stripped === '[]') {
    console.log('[ACTION] ③ Haiku returned empty array — no items detected')
    return { actions: 0, reminders: 0 }
  }

  type ItemCandidate = { type?: string; title: string; detail: string; source_chunk?: string }
  let parsed: ItemCandidate[] = []

  try {
    const result = JSON.parse(stripped)
    parsed = Array.isArray(result) ? result : [result]
    console.log(`[ACTION] ④ JSON parsed OK | ${parsed.length} candidate(s)`)
  } catch (parseErr) {
    console.log(`[ACTION] ④ Direct JSON.parse failed (${(parseErr as Error).message}) — trying regex extraction`)
    const match = stripped.match(/\[[\s\S]+\]/)
    if (match) {
      try {
        parsed = JSON.parse(match[0])
        console.log(`[ACTION] ④ Regex extraction succeeded | ${parsed.length} candidate(s)`)
      } catch (regexErr) {
        console.error(`[ACTION] ④ Regex extraction also failed (${(regexErr as Error).message}) — inserting nothing`)
        return { actions: 0, reminders: 0 }
      }
    } else {
      console.error('[ACTION] ④ No JSON array found in Haiku output — inserting nothing')
      return { actions: 0, reminders: 0 }
    }
  }

  const valid = parsed.filter(item => item?.title && item?.detail)
  if (valid.length === 0) {
    console.error('[ACTION] ④ No valid items after filtering — aborting')
    return { actions: 0, reminders: 0 }
  }

  console.log(`[ACTION] ⑤ Routing ${valid.length} item(s) | project_id=${projectId}`)

  let insertedActions = 0
  let insertedReminders = 0

  for (const item of valid) {
    const isReminder = item.type === 'reminder'
    const table = isReminder ? 'reminder_items' : 'action_items'
    const label = isReminder ? 'reminder' : 'action'

    const { data: insertedData, error } = await supabase.from(table).insert({
      project_id: projectId,
      user_id: userId,
      title: item.title,
      detail: item.detail,
      source_chunk: item.source_chunk ?? null,
      source_conversation_ids: conversationIds,
      status: 'open',
    }).select()

    if (error) {
      console.error(`[ACTION] ⑤ Insert FAILED | type=${label} | title="${item.title}" | code=${error.code} | message=${error.message}`)
    } else {
      console.log(`[ACTION] ⑤ Insert SUCCESS | type=${label} | id=${insertedData?.[0]?.id} | title="${item.title}"`)
      if (isReminder) insertedReminders++
      else insertedActions++
    }
  }

  console.log(`[ACTION] ✅ Done | actions=${insertedActions} reminders=${insertedReminders}`)
  return { actions: insertedActions, reminders: insertedReminders }
}