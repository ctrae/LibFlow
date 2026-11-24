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
  extension_requested_minutes: number | null;
  extension_request_status: 'pending' | 'approved' | 'denied' | 'cancelled' | null;
  extension_requested_at: string | null;
  extension_request_resolved_at: string | null;
};

const studentZoneMigrationMessage =
  'Zone registration is not installed in Supabase. Apply supabase/migrations/202611210001_student_registration_zone.sql.';

const studentActionsMigrationMessage =
  'Supabase cannot find the student action functions. Apply supabase/migrations/202611200001_student_session_actions.sql; if it is already applied, reload the Supabase API schema cache.';

export async function registerStudent(payload: { name: string; email: string; student_id: string; duration_minutes: number; baggage_info: string; zone: LibraryZone }) {
  const normalizedEmail = payload.email.trim().toLowerCase();
  if (!normalizedEmail.endsWith('@mymona.uwi.edu')) throw new Error('Use your @mymona.uwi.edu email address');
  if (![15, 30, 45, 60].includes(payload.duration_minutes)) throw new Error('Choose a stay between 15 and 60 minutes');
  if (payload.zone !== 'Main section' && payload.zone !== 'Basement') throw new Error('Choose a valid library zone');
  const studentId = Number(payload.student_id.trim());
  if (!Number.isSafeInteger(studentId) || studentId < 0) throw new Error('Enter a valid student ID number');

  const { data, error } = await supabase.rpc('register_library_visit', {
    p_name: payload.name.trim(),
    p_email: normalizedEmail,
    p_student_id: studentId,
    p_duration_minutes: payload.duration_minutes,
    p_baggage_info: payload.baggage_info.trim() || 'No bag declared',
    p_short_code: createShortCode(),
    p_zone: payload.zone,
  });
  if (error) throw new Error(formatSupabaseError(error, 'Unable to register your visit', studentZoneMigrationMessage));
  return normalizeSession(data as LibrarySession);
}

export async function getStudentStatus(code: string) {
  const { data, error } = await supabase.rpc('get_library_session_by_code', { p_short_code: code.toUpperCase() });
  if (error) throw new Error(formatSupabaseError(error, 'Access code not found'));
  const session = (data as LibrarySession[] | null)?.[0];
  if (!session) throw new Error('Access code not found');
  return normalizeSession(session);
}

export async function checkoutStudent(code: string) {
  const { data, error } = await supabase.rpc('checkout_library_session', {
    p_short_code: code.toUpperCase(),
  });
  if (error) throw new Error(formatSupabaseError(error, 'Unable to check out', studentActionsMigrationMessage));
  return normalizeSession(data as LibrarySession);
}

export async function requestSessionExtension(code: string, requestedMinutes: number) {
  if (!Number.isInteger(requestedMinutes) || requestedMinutes < 1 || requestedMinutes > 60) {
    throw new Error('Request between 1 and 60 additional minutes.');
  }

  const { data, error } = await supabase.rpc('request_library_session_extension', {
    p_short_code: code.toUpperCase(),
    p_requested_minutes: requestedMinutes,
  });
  if (error) throw new Error(formatSupabaseError(error, 'Unable to request additional time', studentActionsMigrationMessage));
  return normalizeSession(data as LibrarySession);
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

export async function resolveSessionExtension(id: string, approve: boolean) {
  const { data, error } = await supabase.rpc('resolve_library_session_extension', {
    p_session_id: id,
    p_approve: approve,
  });
  if (error) throw new Error(formatSupabaseError(error, 'Unable to resolve extension request', studentActionsMigrationMessage));
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

function formatSupabaseError(
  error: { message: string; code?: string },
  fallback = 'Unable to complete the library request',
  missingFunctionMessage = 'The Supabase library schema is out of date. Apply all SQL migrations in supabase/migrations/ in timestamp order, setting the initial admin email before the final migration.',
) {
  if (error.code === 'PGRST202') {
    return missingFunctionMessage;
  }
  if (error.code === 'PGRST205') {
    return 'The Supabase library schema is out of date. Apply all SQL migrations in supabase/migrations/ in timestamp order, setting the initial admin email before the final migration.';
  }
  if (error.code === 'PGRST204') {
    return 'The Supabase library schema is out of date. Run the latest migration in supabase/migrations/ in the Supabase SQL Editor.';
  }
  return error.message || fallback;
}
