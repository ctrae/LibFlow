import { supabase } from '@/integrations/supabase/client';

export type LibraryZone = 'Main section' | 'Basement';
export type SessionStatus = 'waiting' | 'inside' | 'exited' | 'expired';

export type LibrarySession = {
  id: string;
  name: string;
  email: string;
  student_id: string;
  short_code: string;
  duration_minutes: number;
  baggage_info: string;
  zone: LibraryZone | null;
  status: SessionStatus;
  created_at: string;
  expires_at: string;
  updated_at: string;
};

export async function registerStudent(payload: { name: string; email: string; student_id: string; duration_minutes: number; baggage_info: string }) {
  const normalizedEmail = payload.email.trim().toLowerCase();
  if (!normalizedEmail.endsWith('@mymona.uwi.edu')) throw new Error('Use your @mymona.uwi.edu email address');
  if (![15, 30, 45, 60].includes(payload.duration_minutes)) throw new Error('Choose a stay between 15 and 60 minutes');

  const { data, error } = await supabase.from('library_sessions').insert({
    name: payload.name.trim(),
    email: normalizedEmail,
    student_id: payload.student_id.trim(),
    duration_minutes: payload.duration_minutes,
    baggage_info: payload.baggage_info.trim() || 'No bag declared',
    short_code: createShortCode(),
    status: 'waiting',
  }).select().single();
  if (error) throw new Error(formatSupabaseError(error.message));
  await supabase.from('library_session_events').insert({ session_id: data.id, event_type: 'registered', zone: null });
  return normalizeSession(data as LibrarySession);
}

export async function getStudentStatus(code: string) {
  const { data, error } = await supabase.from('library_sessions').select('*').eq('short_code', code.toUpperCase()).single();
  if (error) throw new Error(formatSupabaseError(error.message, 'Access code not found'));
  return normalizeSession(data as LibrarySession);
}

export async function getAdminSessions() {
  const { data, error } = await supabase.from('library_sessions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(formatSupabaseError(error.message));
  return (data || []).map((session) => normalizeSession(session as LibrarySession));
}

export async function updateAdminStatus(id: string, zone: LibraryZone, status: SessionStatus) {
  const { data, error } = await supabase.from('library_sessions').update({ zone, status }).eq('id', id).select().single();
  if (error) throw new Error(formatSupabaseError(error.message));
  await supabase.from('library_session_events').insert({ session_id: id, event_type: status, zone });
  return normalizeSession(data as LibrarySession);
}

function createShortCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function normalizeSession(session: LibrarySession): LibrarySession {
  if (session.status !== 'exited' && new Date(session.expires_at).getTime() <= Date.now()) {
    return { ...session, status: 'expired' };
  }
  return session;
}

function formatSupabaseError(message: string, fallback = 'Unable to complete the library request') {
  if (message.includes('PGRST205') || message.includes('library_sessions')) {
    return 'The library tables are not installed in Supabase yet. Run supabase/migrations/202609200001_library_tracking.sql in the Supabase SQL Editor.';
  }
  return message || fallback;
}
