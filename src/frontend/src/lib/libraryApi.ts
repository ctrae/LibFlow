import { supabase } from '@/integrations/supabase/client';

export type LibraryZone = 'Main section' | 'Basement';
export type SessionStatus = 'active' | 'exited' | 'expired';

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
  const studentId = Number(payload.student_id.trim());
  if (!Number.isSafeInteger(studentId) || studentId < 0) throw new Error('Enter a valid student ID number');

  const { data, error } = await supabase.rpc('register_library_visit', {
    p_name: payload.name.trim(),
    p_email: normalizedEmail,
    p_student_id: studentId,
    p_duration_minutes: payload.duration_minutes,
    p_baggage_info: payload.baggage_info.trim() || 'No bag declared',
    p_short_code: createShortCode(),
  });
  if (error) throw new Error(formatSupabaseError(error));
  return normalizeSession(data as LibrarySession);
}

export async function getStudentStatus(code: string) {
  const { data, error } = await supabase.rpc('get_library_session_by_code', { p_short_code: code.toUpperCase() });
  if (error) throw new Error(formatSupabaseError(error, 'Access code not found'));
  const session = (data as LibrarySession[] | null)?.[0];
  if (!session) throw new Error('Access code not found');
  return normalizeSession(session);
}

export async function getAdminSessions() {
  const { data, error } = await supabase.from('library_sessions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(formatSupabaseError(error));
  return (data || []).map((session) => normalizeSession(session as LibrarySession));
}

export async function updateAdminStatus(id: string, zone: LibraryZone, status: SessionStatus) {
  const { data, error } = await supabase.rpc('update_library_session_status', {
    p_session_id: id,
    p_zone: zone,
    p_status: status,
  });
  if (error) throw new Error(formatSupabaseError(error));
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

function formatSupabaseError(error: { message: string; code?: string }, fallback = 'Unable to complete the library request') {
  if (error.code === 'PGRST202' || error.code === 'PGRST205') {
    return 'The library tables are not installed in Supabase yet. Run all SQL migrations in supabase/migrations/ in timestamp order, setting the initial admin email before the final migration.';
  }
  if (error.code === 'PGRST204') {
    return 'The Supabase library schema is out of date. Run the latest migration in supabase/migrations/ in the Supabase SQL Editor.';
  }
  return error.message || fallback;
}
