import { supabase } from './supabase.js';

export async function logAccountActivity(eventType, summary) {
  if (!supabase) throw new Error('Account services are not configured.');
  const { error } = await supabase.rpc('log_account_activity', {
    p_event_type: eventType,
    p_summary: summary,
  });
  if (error) throw new Error(`Account activity could not be recorded. ${error.message}`);
}

export async function signOutWithActivity() {
  if (!supabase) throw new Error('Account services are not configured.');
  await logAccountActivity('signed_out', 'You requested to sign out of your account.');
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`You could not be logged out. ${error.message}`);
}
