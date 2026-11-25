import { getOccupancy } from "./api";
import { supabase } from "./supabaseClient"

export async function getCurrentOccupancy(): Promise<number> {
  return getOccupancy();
}

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

export type LibraryUserProfile = {
  user_id: string;
  email: string;
  user_type: 'Student' | 'Head Librarian' | 'Library Staff';
  full_name: string | null;
  is_approved: boolean;
};

const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000')
  .replace(/\/+$/, '');

export async function getCurrentProfile(authUserId: string): Promise<LibraryUserProfile> {
  const { data, error } = await supabase
    .from('users')
    .select('user_id, email, user_type, full_name, is_approved')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No profile is linked to this account.');

  return data;
}

export function getBagClaims() {
  return request<LibrarySession[]>('/library/admin/bag-claims');
}

export function verifyBagClaim(sessionId: string) {
  return request<LibrarySession>(
    `/library/admin/bag-claims/${encodeURIComponent(sessionId)}/verify`,
    { method: 'POST' },
  );
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  suppliedToken?: string,
): Promise<T> {
  let accessToken = suppliedToken;
  if (!accessToken) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    accessToken = data.session?.access_token;
  }
  if (!accessToken) throw new Error('Sign in before accessing bag checks.');

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${backendUrl}${path}`, { ...init, headers });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const detail =
      typeof payload === 'object' &&
      payload !== null &&
      'detail' in payload &&
      typeof payload.detail === 'string'
        ? payload.detail
        : `Backend request failed (${response.status}).`;
    throw new Error(detail);
  }
  return payload as T;
}