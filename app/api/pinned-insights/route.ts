// app/api/pinned-insights/route.ts
// CRUD endpoints for pinned insights

import { createClient } from '../../../lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import { CreatePinnedInsightInput } from '../../../lib/pinned-insights-types';

// GET - Fetch all pinned insights for a conversation
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
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

    // Fetch pinned insights ordered by the order field
    const { data, error } = await supabase
      .from('pinned_insights')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching pinned insights:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pinned insights' },
        { status: 500 }
      );
    }

    return NextResponse.json({ insights: data });
  } catch (error: any) {
    console.error('Fetch pinned insights error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pinned insights' },
      { status: 500 }
    );
  }
}

// POST - Create a new pinned insight
export async function POST(request: Request) {
  try {
    const body: CreatePinnedInsightInput = await request.json();

    const {
      conversation_id,
      section_type,
      custom_title,
      content,
      display_style = 'card',
      order,
      source_question,
    } = body;

    // Validate input
    if (!conversation_id || !section_type || !content) {
      return NextResponse.json(
        { error: 'conversation_id, section_type, and content are required' },
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

    // If order is not provided, get the next available order
    let finalOrder = order;
    if (finalOrder === undefined) {
      const { data: existingInsights } = await supabase
        .from('pinned_insights')
        .select('order')
        .eq('conversation_id', conversation_id)
        .eq('user_id', user.id)
        .order('order', { ascending: false })
        .limit(1);

      finalOrder = existingInsights && existingInsights.length > 0
        ? existingInsights[0].order + 1
        : 0;
    }

    // Insert new pinned insight
    const { data, error } = await supabase
      .from('pinned_insights')
      .insert({
        conversation_id,
        user_id: user.id,
        section_type,
        custom_title,
        content,
        display_style,
        order: finalOrder,
        source_question,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating pinned insight:', error);
      return NextResponse.json(
        { error: 'Failed to create pinned insight' },
        { status: 500 }
      );
    }

    return NextResponse.json({ insight: data }, { status: 201 });
  } catch (error: any) {
    console.error('Create pinned insight error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create pinned insight' },
      { status: 500 }
    );
  }
}
