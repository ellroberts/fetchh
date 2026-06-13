import { createSupabaseClient } from '@/lib/supabase';

export async function checkWaitlistStatus(userId) {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('waitlist')
    .select('status, position')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    return { status: 'not_found', position: null };
  }
  
  return {
    status: data.status || 'pending',
    position: data.position,
    isApproved: data.status === 'approved'
  };
}

export async function addToWaitlist(email, userId = null) {
  const supabase = createSupabaseClient();
  
  // Check if already in waitlist
  const { data: existing } = await supabase
    .from('waitlist')
    .select('id')
    .eq('email', email)
    .single();
  
  if (existing) {
    // Update with user_id if not set
    if (userId && !existing.user_id) {
      await supabase
        .from('waitlist')
        .update({ user_id: userId })
        .eq('id', existing.id);
    }
    return { success: true, message: 'Already on waitlist' };
  }
  
  // Add to waitlist
  const { error } = await supabase
    .from('waitlist')
    .insert({
      email,
      user_id: userId,
      status: 'pending',
      source: 'dashboard'
    });
  
  return {
    success: !error,
    message: error ? error.message : 'Added to waitlist'
  };
}