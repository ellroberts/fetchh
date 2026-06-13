// app/api/conversations/count/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

function getCorsHeaders(req) {
  const origin = (req && req.headers && req.headers.get('origin')) || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(req) {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders(req) });
}

export async function GET(req) {
  const corsHeaders = getCorsHeaders(req);

  try {
    // Authenticate via Bearer token (sent by the extension)
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await serviceClient.auth.getUser(token);

    if (!user || error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    // Count all conversations belonging to this user
    const { count, error: countError } = await serviceClient
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('[count] Supabase error:', countError.message);
      return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ count: count ?? 0 }, { headers: corsHeaders });

  } catch (error) {
    console.error('[count] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}