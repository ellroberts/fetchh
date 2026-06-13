// app/api/pinned-insights/[id]/route.ts
// Update and delete individual pinned insights

import { createClient } from '../../../../lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import { UpdatePinnedInsightInput } from '../../../../lib/pinned-insights-types';

// PATCH - Update a pinned insight
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdatePinnedInsightInput = await request.json();

    const {
      section_type,
      custom_title,
      content,
      display_style,
      order,
      source_question,
    } = body;

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

    // Build update object with only provided fields
    const updateData: any = {};
    if (section_type !== undefined) updateData.section_type = section_type;
    if (custom_title !== undefined) updateData.custom_title = custom_title;
    if (content !== undefined) updateData.content = content;
    if (display_style !== undefined) updateData.display_style = display_style;
    if (order !== undefined) updateData.order = order;
    if (source_question !== undefined) updateData.source_question = source_question;

    // Update the pinned insight (RLS ensures user owns it)
    const { data, error } = await supabase
      .from('pinned_insights')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating pinned insight:', error);
      return NextResponse.json(
        { error: 'Failed to update pinned insight' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Pinned insight not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ insight: data });
  } catch (error: any) {
    console.error('Update pinned insight error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update pinned insight' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a pinned insight
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Delete the pinned insight (RLS ensures user owns it)
    const { error } = await supabase
      .from('pinned_insights')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting pinned insight:', error);
      return NextResponse.json(
        { error: 'Failed to delete pinned insight' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Delete pinned insight error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete pinned insight' },
      { status: 500 }
    );
  }
}
