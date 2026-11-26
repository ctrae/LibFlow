/**
 * LibFlow API client.
 *
 * Pages call these functions and never talk to Supabase directly. Requests go
 * to the FastAPI backend (presentation -> business logic -> data access).
 *
 * The only Supabase use here is reading the signed-in staff member's access
 * token, which the backend checks. Students are not signed in, so student
 * calls (checkIn, checkOutBySession, checkOutByStudent, getSession) send no
 * token.
 */

import { supabase } from "./supabaseClient";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const BASE = `${API_URL}/library`;

// ---------------------------------------------------------------------------
// Types (match backend/app/library/schemas.py)
// ---------------------------------------------------------------------------

export type SessionStatus = "active" | "exited" | "expired";
export type Zone = "Main" | "Basement";
export type StaffRole = "library_staff" | "head_librarian";

export interface CheckInRequest {
  student_id: string;
  student_email: string;
  allotted_minutes: number; // 15 to 480
  zone?: Zone;
  bag_number?: string | null;
  visit_reason?: string | null;
}

export interface CheckInResponse {
  session_id: string;
  student_id: string;
  check_in: string;
  expires_at: string;
  status: "active";
}

export interface CheckOutResponse {
  session_id: string;
  student_id: string;
  check_out: string;
  status: "exited";
}

export interface Session {
  id: string;
  student_id: string;
  student_email: string;
  check_in: string;
  check_out: string | null;
  allotted_minutes: number;
  zone: string | null;
  bag_number: string | null;
  visit_reason: string | null;
  status: SessionStatus;
  expires_at: string | null;
}

export interface Bag {
  session_id: string;
  student_id: string;
  bag_number: string | null;
  status: SessionStatus;
}

export interface SessionEvent {
  id: number;
  session_id: string;
  event_status: SessionStatus;
  created_at: string;
}

export interface HourlyOccupancyRow {
  hour_label: string;
  students_present: number;
  check_ins: number;
  check_outs: number;
}

export interface DailyTotalsRow {
  visit_date: string;
  total_visits: number;
  unique_students: number;
}

export interface AverageStay {
  avg_stay_minutes: number;
  completed_visits: number;
}

export interface SavedDailyTotal {
  day: string;
  total_visits: number;
  unique_students: number;
  saved_at: string;
  saved_by: string | null;
}

export interface StaffMember {
  user_id: string;
  role: StaffRole;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Thrown for any failed request. `message` is safe to show to the user. */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }

  /** True when staff need to sign in again. */
  get isAuthError() {
    return this.status === 401;
  }
}

function friendlyMessage(status: number, body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;

  // Our own errors: { detail: "Student already has an active library session." }
  if (typeof detail === "string") return detail;

  // FastAPI validation errors: { detail: [{ msg: "Value error, ...", loc: [...] }] }
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string; loc?: unknown[] };
    const msg = (first.msg ?? "").replace(/^Value error,\s*/i, "");
    const field = String(first.loc?.[first.loc.length - 1] ?? "").replace(/_/g, " ");
    return msg ? (field ? `${field}: ${msg}` : msg) : "Please check the details you entered.";
  }

  if (status === 401) return "Please sign in again.";
  if (status === 403) return "You do not have access to do that.";
  if (status >= 500) return "Something went wrong on our side. Please try again.";
  return "Something went wrong. Please try again.";
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

async function staffToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; staff?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (options.staff) {
    const token = await staffToken();
    if (!token) throw new ApiError("Please sign in again.", 401);
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection and try again.", 0);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(friendlyMessage(response.status, body), response.status);
  }

  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Student (no sign-in)
// ---------------------------------------------------------------------------

export const checkIn = (input: CheckInRequest) =>
  request<CheckInResponse>("/check-in", { method: "POST", body: input });

/** Staff override check-in: allowed outside opening hours. Needs a staff sign-in. */
export const staffCheckIn = (input: CheckInRequest) =>
  request<CheckInResponse>("/staff/check-in", { method: "POST", body: input, staff: true });

/** Check out using the session id returned at check-in. */
export const checkOutBySession = (sessionId: string) =>
  request<CheckOutResponse>(`/check-out/${encodeURIComponent(sessionId)}`, { method: "POST" });

/** Check out with student ID and email (for a student who lost the session). */
export const checkOutByStudent = (studentId: string, email: string) =>
  request<CheckOutResponse>("/student/check-out", {
    method: "POST",
    body: { student_id: studentId, student_email: email },
  });

/** The student dashboard reads its own session by id. */
export const getSession = (sessionId: string) =>
  request<Session>(`/sessions/${encodeURIComponent(sessionId)}`);

export const extendStay = (
  sessionId: string,
  extensionMinutes: number
) =>
  request<ExtendStayResponse>(
    `/sessions/${encodeURIComponent(sessionId)}/extend`,
    {
      method: "POST",
      body: {
        extension_minutes: extensionMinutes,
      },
    }
  );

export interface ExtendStayResponse {
  session_id: string;
  student_id: string;
  extension_minutes: number;
  allotted_minutes: number;
  expires_at: string;
  status: "active";
}

// ---------------------------------------------------------------------------
// Staff (signed in with Supabase Auth)
// ---------------------------------------------------------------------------

export const getOccupancy = () =>
  request<{ occupancy: number }>("/occupancy", { staff: true }).then((r) => r.occupancy);

export const getSessions = (status?: SessionStatus) =>
  request<Session[]>(`/sessions${status ? `?status=${status}` : ""}`, { staff: true });

export const getStudentHistory = (studentId: string) =>
  request<Session[]>(`/students/${encodeURIComponent(studentId)}/sessions`, { staff: true });

/** Manual override, e.g. staff-assisted check-out ("exited") or expiry. */
export const updateSessionStatus = (sessionId: string, status: SessionStatus) =>
  request<{ session_id: string; status: SessionStatus; updated: boolean }>(
    `/sessions/${encodeURIComponent(sessionId)}/status`,
    { method: "PATCH", body: { status }, staff: true }
  );

/** Close every session whose allotted time has run out. */
export const expireOverdueSessions = () =>
  request<{ expired_count: number }>("/sessions/expire-overdue", { method: "POST", staff: true });

export const getBags = () => request<Bag[]>("/bags", { staff: true });

/** Link a bag number to an active session. Pass null to release the bag. */
export const updateBag = (sessionId: string, bagNumber: string | null) =>
  request<Bag>(`/sessions/${encodeURIComponent(sessionId)}/bag`, {
    method: "PATCH",
    body: { bag_number: bagNumber },
    staff: true,
  });

export const getEvents = (sessionId?: string) =>
  request<SessionEvent[]>(
    `/events${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`,
    { staff: true }
  );

// ---------------------------------------------------------------------------
// Reports (staff). Dates are YYYY-MM-DD.
// ---------------------------------------------------------------------------

export const getHourlyOccupancy = (date: string) =>
  request<HourlyOccupancyRow[]>(`/analytics/hourly?date=${encodeURIComponent(date)}`, { staff: true });

export const getDailyTotals = (start: string, end: string) =>
  request<DailyTotalsRow[]>(
    `/analytics/daily?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    { staff: true }
  );

export const getAverageStay = (start: string, end: string) =>
  request<AverageStay>(
    `/analytics/average-stay?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    { staff: true }
  );

export const getTotalCheckouts = (start: string, end: string) =>
  request<{ total_checkouts: number }>(
    `/analytics/total-checkouts?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    { staff: true }
  );

/** Save the visit totals for one day to the database (FR-06). */
export const saveDailyTotal = (date: string) =>
  request<SavedDailyTotal>(`/daily-totals/${encodeURIComponent(date)}`, { method: "POST", staff: true });

// ---------------------------------------------------------------------------
// Head librarian only
// ---------------------------------------------------------------------------

export const listStaff = () => request<StaffMember[]>("/staff", { staff: true });

export const addStaff = (userId: string, role: StaffRole = "library_staff") =>
  request<StaffMember>("/staff", { method: "POST", body: { user_id: userId, role }, staff: true });

export const removeStaff = (userId: string) =>
  request<{ removed: boolean; user_id: string }>(`/staff/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    staff: true,
  });
