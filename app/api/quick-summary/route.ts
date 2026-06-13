// app/api/quick-summary/route.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
function estimateReadingTime(messageCount: number): number {
  const exchanges = Math.ceil(messageCount / 2);
  return Math.max(1, exchanges * 2);
}

export async function POST(request: Request) {
  try {
    const { conversationId } = await request.json();
    console.log('[Quick Summary] Starting for conversation:', conversationId);

    if (!conversationId) {
      console.error('[Quick Summary] No conversationId provided');
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

    // Get conversation with messages
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (fetchError || !conversation) {
      console.error('[Quick Summary] Conversation not found:', fetchError);
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    console.log('[Quick Summary] Conversation found, message count:', conversation.messages?.length || conversation.content?.messages?.length || 0);

    // Check if quick_summary already exists
    if (conversation.quick_summary) {
      console.log('[Quick Summary] Using cached summary');
      // Backfill tags if missing
      if (!conversation.tags && conversation.quick_summary.key_topics?.length) {
        const tagsValue = conversation.quick_summary.key_topics.join(', ');
        await supabase.from('conversations').update({ tags: tagsValue }).eq('id', conversationId);
        console.log('[Quick Summary] Backfilled tags:', tagsValue);
      }
      return NextResponse.json({ summary: conversation.quick_summary });
    }

    // Extract messages
    let messages = [];
    if (conversation.content?.messages) {
      messages = conversation.content.messages;
    } else if (conversation.messages) {
      messages = conversation.messages;
    } else {
      console.error('[Quick Summary] No messages found in conversation');
      return NextResponse.json(
        { error: 'No messages found in conversation' },
        { status: 400 }
      );
    }

    console.log('[Quick Summary] Generating new summary...');

    // Generate quick summary using Claude Haiku (cheaper, faster)
    const summary = await generateQuickSummary(messages);

    console.log('[Quick Summary] Summary generated successfully');

    // Add reading time estimate
    const summaryWithReadingTime = {
      ...summary,
      reading_time_minutes: estimateReadingTime(messages.length),
    };

    // Save summary to database, also write key_topics to tags column for filtering
    const tagsValue = summary.key_topics?.length
      ? summary.key_topics.join(', ')
      : null;

    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        quick_summary: summaryWithReadingTime,
        analysis_tier: 'quick',
        ...(tagsValue && { tags: tagsValue }),
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('[Quick Summary] Failed to save quick summary:', updateError);
    } else {
      console.log('[Quick Summary] Saved to database with tags:', tagsValue);
    }

    return NextResponse.json({ summary: summaryWithReadingTime });
  } catch (error: any) {
    console.error('[Quick Summary] Error:', error);
    console.error('[Quick Summary] Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to generate quick summary' },
      { status: 500 }
    );
  }
}

async function generateQuickSummary(messages: any[]) {
  console.log('[Quick Summary] Checking API key...');
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('[Quick Summary] ANTHROPIC_API_KEY not configured!');
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  console.log('[Quick Summary] API key found, processing', messages.length, 'messages');

  // Build conversation context (limit to key messages if very long)
  const maxMessagesToAnalyze = 40;
  const messagesToAnalyze = messages.length > maxMessagesToAnalyze
    ? [
        ...messages.slice(0, 15), // First 15 messages
        ...messages.slice(-15),   // Last 15 messages
      ]
    : messages;

  console.log('[Quick Summary] Analyzing', messagesToAnalyze.length, 'messages');

  const conversationText = messagesToAnalyze
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');

  const quickSummaryPrompt = `Analyze this conversation and provide a brief, high-level summary. Keep it concise and focused on the main points.

Return ONLY valid JSON (no markdown, no code blocks) with this structure:
{
  "overview": "2-3 sentence summary of the conversation",
  "key_topics": ["topic1", "topic2", "topic3"],
  "problems_solved": ["brief problem 1", "brief problem 2"]
}

IMPORTANT:
- Keep overview to 2-3 sentences maximum
- List only 3-5 key topics
- List only 2-4 main problems addressed
- Be concise - this is a quick summary, not deep analysis

Conversation:
${conversationText}`;

  console.log('[Quick Summary] Calling Anthropic API (Haiku)...');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001', // Cheaper model — sufficient for quick summaries
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: quickSummaryPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Quick Summary] Anthropic API error:', response.status, errorText);
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  console.log('[Quick Summary] API response received');

  const result = await response.json();
  const summaryText = result.content[0].text;

  console.log('[Quick Summary] Parsing response...');
  console.log('[Quick Summary] Raw response:', summaryText.substring(0, 200) + '...');

  // Parse JSON response - handle various formats Claude might return
  let cleanedText = summaryText.trim();

  // Step 1: Remove markdown code blocks if present
  if (cleanedText.includes('```json')) {
    cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (cleanedText.includes('```')) {
    cleanedText = cleanedText.replace(/```\n?/g, '');
  }

  // Step 2: Extract JSON object by finding first { and last }
  const firstBrace = cleanedText.indexOf('{');
  const lastBrace = cleanedText.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    console.error('[Quick Summary] No JSON object found in response:', cleanedText);
    throw new Error('No JSON object found in Claude response');
  }

  cleanedText = cleanedText.substring(firstBrace, lastBrace + 1).trim();

  console.log('[Quick Summary] Extracted JSON:', cleanedText.substring(0, 100) + '...');

  try {
    const parsed = JSON.parse(cleanedText);
    console.log('[Quick Summary] Successfully parsed response');
    return parsed;
  } catch (parseError) {
    console.error('[Quick Summary] Failed to parse Claude response:', cleanedText);
    console.error('[Quick Summary] Parse error:', parseError);
    throw new Error('Failed to parse summary result');
  }
}