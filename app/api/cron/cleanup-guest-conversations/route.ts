import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  // Verify this is being called by Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('conversations')
    .delete()
    .is('user_id', null)
    .lt('created_at', thirtyDaysAgo)
    .select('id');

  if (error) {
    console.error('[cron] Cleanup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[cron] Deleted ${data?.length || 0} expired guest conversations`);
  return NextResponse.json({ deleted: data?.length || 0 });
}