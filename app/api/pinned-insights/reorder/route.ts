// app/api/pinned-insights/reorder/route.ts
// Endpoint to reorder pinned insights

import { createClient } from '../../../../lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import { ReorderPinnedInsightsInput } from '../../../../lib/pinned-insights-types';

// POST - Reorder pinned insights
export async function POST(request: Request) {
  try {
    const body: ReorderPinnedInsightsInput = await request.json();
    const { conversation_id, insight_ids } = body;

    if (!conversation_id || !insight_ids || !Array.isArray(insight_ids)) {
      return NextResponse.json(
        { error: 'conversation_id and insight_ids array are required' },
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

    // Update order for each insight
    const updatePromises = insight_ids.map((insightId, index) =>
      supabase
        .from('pinned_insights')
        .update({ order: index })
        .eq('id', insightId)
        .eq('user_id', user.id)
        .eq('conversation_id', conversation_id)
    );

    const results = await Promise.all(updatePromises);

    // Check if any updates failed
    const errors = results.filter((result) => result.error);
    if (errors.length > 0) {
      console.error('Error reordering pinned insights:', errors);
      return NextResponse.json(
        { error: 'Failed to reorder some pinned insights' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reorder pinned insights error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reorder pinned insights' },
      { status: 500 }
    );
  }
}
