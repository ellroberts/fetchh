// app/api/share/[id]/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Service-role client configured for server-side use.
// persistSession: false prevents the client from caching auth state that could
// override the service-role Authorization header in long-lived serverless processes.
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// CORS headers shared across responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a value is a usable messages array (non-empty array of
 * objects that each have a role and non-empty content string).
 */
function hasValidMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return false;
  return messages.some(
    m => m && typeof m === 'object' && m.role && typeof m.content === 'string' && m.content.length > 0,
  );
}

/**
 * Normalise a raw conversation blob (object or array) into a flat
 * messages array of { role, content, timestamp }.
 */
function extractMessages(data) {
  if (!data) return [];

  // Already a messages array at the top level
  if (Array.isArray(data)) {
    return data.map(msg => ({
      role: msg.role || (msg.sender === 'human' ? 'user' : 'assistant') || 'unknown',
      content: msg.content || msg.text || '',
      timestamp: msg.timestamp || msg.created_at || null,
    }));
  }

  // Object with a .messages array
  if (data.messages && Array.isArray(data.messages)) {
    return data.messages.map(msg => ({
      role: msg.role || msg.sender || 'unknown',
      content: msg.content || msg.text || '',
      timestamp: msg.timestamp || msg.created_at || null,
    }));
  }

  // ChatGPT mapping format
  if (data.mapping && typeof data.mapping === 'object') {
    const messages = [];
    Object.values(data.mapping).forEach(node => {
      if (node.message?.content?.parts) {
        messages.push({
          role: node.message.author?.role || 'unknown',
          content: node.message.content.parts.join('\n'),
          timestamp: node.message.create_time
            ? new Date(node.message.create_time * 1000).toISOString()
            : null,
        });
      }
    });
    return messages.filter(msg => msg.content.trim() !== '');
  }

  return [];
}

/**
 * Given a raw column value (jsonb comes back as object/array; json/text may
 * come back as a string), ensure we have a parsed JS value.
 */
function parseColumn(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw; // already parsed object/array
}

/**
 * Resolve the best messages array from the three data columns using
 * fallback order: messages → content → full_transcript.
 */
function resolveMessages(conversation) {
  // 1. messages column (most likely already normalised)
  const msgs = parseColumn(conversation.messages);
  if (hasValidMessages(msgs)) return msgs;

  // 2. content column (may be a raw conversation object)
  const content = parseColumn(conversation.content);
  if (content) {
    const fromContent = Array.isArray(content) ? extractMessages(content) : extractMessages(content);
    if (hasValidMessages(fromContent)) return fromContent;
  }

  // 3. full_transcript column
  const transcript = parseColumn(conversation.full_transcript);
  if (transcript) {
    const fromTranscript = extractMessages(transcript);
    if (hasValidMessages(fromTranscript)) return fromTranscript;
  }

  return [];
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' },
  });
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '0', 10); // 0 = no pagination

    if (!id) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Fetch conversation — only reference columns that actually exist
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('id, title, content, messages, full_transcript, source, created_at, message_count, summary, platform')
      .eq('id', id)
      .single();

    if (error || !conversation) {
      console.error('[share] Fetch failed:', {
        conversationId: id,
        code: error?.code,
        message: error?.message,
        hint: error?.hint,
      });

      const isRLS = error?.code === '42501'
        || (error?.message && error.message.includes('row-level security'));
      const status = isRLS ? 403 : 404;
      const message = isRLS
        ? 'Access denied — RLS policy does not allow public reads. Apply migration 012.'
        : 'Conversation not found';

      return NextResponse.json(
        { error: message, code: error?.code || null, hint: error?.hint || null },
        { status, headers: corsHeaders },
      );
    }

    // Resolve messages from whichever column has data
    const messages = resolveMessages(conversation);

    // Apply pagination if requested
    const totalMessages = messages.length;
    const paginatedMessages = limit > 0
      ? messages.slice((page - 1) * limit, page * limit)
      : messages;
    const totalPages = limit > 0 ? Math.ceil(totalMessages / limit) : 1;

    // Build response for both AI consumption and Chrome extension
    const response = {
      pagination: limit > 0 ? {
        page,
        limit,
        total_pages: totalPages,
        total_messages: totalMessages,
        has_more: page < totalPages,
      } : null,
      // Chrome Extension format
      title: conversation.title,
      url: `${request.nextUrl.origin}/share/${id}`,
      timestamp: conversation.created_at,
      platform: conversation.platform || conversation.source,
      total_messages: conversation.message_count || totalMessages,
      messages: paginatedMessages,
      shareableUrl: `${request.nextUrl.origin}/api/share/${id}`,
      source: 'ThreadCub Dashboard',
      conversationId: conversation.id,

      // AI Consumption format
      id: conversation.id,
      summary: conversation.summary || generateConversationSummary(messages),
      context: {
        platform: conversation.platform || conversation.source,
        total_messages: conversation.message_count || totalMessages,
        conversation_date: conversation.created_at,
        key_topics: extractKeyTopics(messages),
      },

      // Instructions for AI
      ai_instructions: {
        purpose: 'This is a previous conversation that can be used for context in continuing the discussion',
        usage: 'You can reference specific messages, topics discussed, or the overall context from this conversation',
        format: 'Messages are in chronological order with role (user/assistant) and content',
      },
    };

    return NextResponse.json(response, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
      },
    });

  } catch (error) {
    console.error('[share] Unexpected error:', error.message, error.stack);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500, headers: corsHeaders },
    );
  }
}

// ---------------------------------------------------------------------------
// Summary / topic helpers
// ---------------------------------------------------------------------------

function generateConversationSummary(messages) {
  if (!messages || messages.length === 0) return 'Empty conversation';

  const userMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'human');
  if (userMessages.length === 0) return `Conversation with ${messages.length} messages.`;

  const last = userMessages[userMessages.length - 1].content.substring(0, 150);
  return `Previous conversation context: "${last}${last.length >= 150 ? '...' : ''}" (${messages.length} total messages exchanged)`;
}

function extractKeyTopics(messages) {
  if (!messages || messages.length === 0) return [];

  const allText = messages.map(msg => msg.content || '').join(' ').toLowerCase();
  const techKeywords = [
    'api', 'database', 'react', 'javascript', 'python', 'supabase',
    'chrome extension', 'nextjs', 'vercel', 'authentication', 'error',
    'function', 'component', 'bug', 'fix', 'feature', 'deploy', 'build',
  ];
  return techKeywords.filter(kw => allText.includes(kw)).slice(0, 10);
}
