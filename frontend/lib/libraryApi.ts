import { supabase } from "./supabaseClient";
import {
  getOccupancy,
  getDailyTotals,
  getAverageStay as fetchAverageStay,
  getHourlyOccupancy as fetchHourlyOccupancy,
  getTotalCheckouts as fetchTotalCheckouts,
} from "./api";

import type {
  DailyTotalsRow,
  AverageStay,
  HourlyOccupancyRow,
} from "./api";

// Compatibility types used by the existing login and bag-check pages.
export type LibraryZone = "Main section" | "Basement";

export type LibrarySession = {
  id: string;
  name: string;
  email: string;
  student_id: string;
  short_code: string;
  duration_minutes: number;
  baggage_info: string;
  zone: LibraryZone | null;
  status: "active" | "exited" | "expired";
  created_at: string;
  expires_at: string;
  updated_at: string;
};

export type LibraryUserProfile = {
  user_id: string;
  email: string;
  user_type: "Student" | "Head Librarian" | "Library Staff";
  full_name: string | null;
  is_approved: boolean;
};

// FR-03 report types.
export type DailyVisitTotal = DailyTotalsRow;
export type AverageStayReport = AverageStay;
export type HourlyOccupancyReport = HourlyOccupancyRow;

// Existing login profile lookup.
// Authentication/profile lookup is separate from FR-03 reporting.
export async function getCurrentProfile(
  authUserId: string,
): Promise<LibraryUserProfile> {
  const { data, error } = await supabase
    .from("users")
    .select("user_id, email, user_type, full_name, is_approved")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("No profile is linked to this account.");

  return data as LibraryUserProfile;
}

// Existing bag-check compatibility functions.
// The corresponding backend routes still need to be implemented.
const backendUrl = (
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
).replace(/\/+$/, "");

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw new Error(error.message);

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("Sign in before accessing bag checks.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  if (init.body) headers.set("Content-Type", "application/json");

  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers,
  });

  const payload: unknown = await response.json();

  if (!response.ok) {
    const detail =
      typeof payload === "object" &&
      payload !== null &&
      "detail" in payload &&
      typeof payload.detail === "string"
        ? payload.detail
        : `Backend request failed (${response.status}).`;

    throw new Error(detail);
  }

  return payload as T;
}

export function getBagClaims() {
  return request<LibrarySession[]>("/library/admin/bag-claims");
}

export function verifyBagClaim(sessionId: string) {
  return request<LibrarySession>(
    `/library/admin/bag-claims/${encodeURIComponent(sessionId)}/verify`,
    { method: "POST" },
  );
}

// FR-03: all reporting functions use the backend API client.
export async function getCurrentOccupancy(): Promise<number> {
  return getOccupancy();
}

export async function getDailyVisitTotals(
  startDate: string,
  endDate: string,
): Promise<DailyVisitTotal[]> {
  return getDailyTotals(startDate, endDate);
}

export async function getAverageStay(
  startDate: string,
  endDate: string,
): Promise<AverageStayReport> {
  return fetchAverageStay(startDate, endDate);
}

export async function getHourlyOccupancy(
  date: string,
): Promise<HourlyOccupancyReport[]> {
  return fetchHourlyOccupancy(date);
}

export async function getTotalCheckouts(
  startDate: string,
  endDate: string,
): Promise<number> {
  const result = await fetchTotalCheckouts(startDate, endDate);
  return result.total_checkouts;
}


export async function verifyAnalyticsStaff(): Promise<boolean> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return false;

  try {
    const profile = await getCurrentProfile(user.id);

    const isStaff =
      profile.user_type === "Head Librarian" ||
      profile.user_type === "Library Staff";

    if (!isStaff || !profile.is_approved) {
      await supabase.auth.signOut();
      return false;
    }

    return true;
  } catch {
    await supabase.auth.signOut();
    return false;
  }
}

export async function logoutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function getNextDateString(date: string): string {
  const nextDate = new Date(`${date}T12:00:00`);
  nextDate.setDate(nextDate.getDate() + 1);

  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, "0");
  const day = String(nextDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
