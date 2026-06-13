// app/api/claude/route.js
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not found in environment');
      return Response.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const body = await request.json();
    console.log('Request body:', body);

    const { messages, model = 'claude-sonnet-4-20250514', max_tokens = 1024 } = body;

    // Ensure messages are properly formatted
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    console.log('Calling Anthropic with:', { model, max_tokens, messages: formattedMessages });

    const response = await anthropic.messages.create({
      model: model,
      max_tokens: max_tokens,
      messages: formattedMessages,
    });

    console.log('Anthropic response received');

    return Response.json({ 
      content: response.content[0].text 
    });
  } catch (error) {
    console.error('Detailed error:', {
      name: error.name,
      message: error.message,
      status: error.status,
      type: error.type,
      stack: error.stack
    });

    // Return more detailed error info
    return Response.json(
      { 
        error: error.message || 'Failed to get response from Claude',
        details: {
          status: error.status,
          type: error.type,
          name: error.name
        }
      },
      { status: error.status || 500 }
    );
  }
}