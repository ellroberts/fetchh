// app/api/embeddings/status/route.ts
// API endpoint for checking embedding status of conversations

import { createClient } from '../../../../lib/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        { error: 'ids parameter is required (comma-separated)' },
        { status: 400 }
      );
    }

    const conversationIds = idsParam.split(',').map(id => id.trim());

    if (conversationIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one conversation id is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    // Get conversations with embedding info
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, has_embeddings, last_embedded_at')
      .in('id', conversationIds)
      .eq('user_id', user.id);

    if (convError) {
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    // Get embedding statuses
    const { data: statuses, error: statusError } = await supabase
      .from('conversation_embedding_status')
      .select('*')
      .in('conversation_id', conversationIds)
      .eq('user_id', user.id);

    if (statusError) {
      console.error('Failed to fetch embedding statuses:', statusError);
    }

    // Build response
    const statusMap = new Map(
      (statuses || []).map(s => [s.conversation_id, s])
    );

    const result = conversations.map(conv => ({
      conversation_id: conv.id,
      has_embeddings: conv.has_embeddings || false,
      last_embedded_at: conv.last_embedded_at,
      status: statusMap.get(conv.id) || null,
    }));

    // Add missing conversations (not found or not owned)
    const foundIds = new Set(conversations.map(c => c.id));
    for (const id of conversationIds) {
      if (!foundIds.has(id)) {
        result.push({
          conversation_id: id,
          has_embeddings: false,
          last_embedded_at: null,
          status: null,
        });
      }
    }

    return NextResponse.json({ statuses: result });
  } catch (error: any) {
    console.error('Embedding status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check embedding status' },
      { status: 500 }
    );
  }
}

// POST method for batch status check with more data
export async function POST(request: Request) {
  try {
    const { conversation_ids } = await request.json();

    if (!conversation_ids || !Array.isArray(conversation_ids)) {
      return NextResponse.json(
        { error: 'conversation_ids array is required' },
        { status: 400 }
      );
    }

    if (conversation_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one conversation id is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    // Get conversations with embedding info
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, title, has_embeddings, last_embedded_at, message_count')
      .in('id', conversation_ids)
      .eq('user_id', user.id);

    if (convError) {
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    // Get embedding statuses
    const { data: statuses, error: statusError } = await supabase
      .from('conversation_embedding_status')
      .select('*')
      .in('conversation_id', conversation_ids)
      .eq('user_id', user.id);

    if (statusError) {
      console.error('Failed to fetch embedding statuses:', statusError);
    }

    // Build response with full details
    const statusMap = new Map(
      (statuses || []).map(s => [s.conversation_id, s])
    );

    const result = conversations.map(conv => ({
      conversation_id: conv.id,
      title: conv.title,
      message_count: conv.message_count,
      has_embeddings: conv.has_embeddings || false,
      last_embedded_at: conv.last_embedded_at,
      status: statusMap.get(conv.id) || null,
    }));

    // Summary statistics
    const summary = {
      total: conversation_ids.length,
      found: conversations.length,
      with_embeddings: result.filter(r => r.has_embeddings).length,
      pending: result.filter(r => r.status?.status === 'pending').length,
      processing: result.filter(r => r.status?.status === 'processing').length,
      failed: result.filter(r => r.status?.status === 'failed').length,
      not_found: conversation_ids.length - conversations.length,
    };

    return NextResponse.json({
      statuses: result,
      summary,
    });
  } catch (error: any) {
    console.error('Embedding status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check embedding status' },
      { status: 500 }
    );
  }
}