import { supabase } from "./supabaseClient";

export async function getCurrentOccupancy(): Promise<number> {
  const { count, error } = await supabase
    .from("library_sessions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  if (error) {
    console.error(
      "Error fetching current occupancy:",
      error.message,
      error.code,
      error.details,
      error.hint
    );
    throw error;
  }

  return count ?? 0;
}


export type ActiveSession = {
  id: string;
  student_id: string;
  student_email: string;
  check_in: string;
  allotted_minutes: number;
  zone: string | null;
  bag_number: string | null;
  visit_reason: string | null;
  status: string;
};

export type StaffCheckInInput = {
  studentId: string;
  email: string;
  minutes: number;
  zone: "Main" | "Basement";
  reason?: string;
  bagNumber?: string;
};

// Turns a database error into a message a person can act on.
export function friendlyError(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (e?.code === "23505") {
    return "That student already has an active session (or that bag number is already in use).";
  }
  if (e?.code === "23514") {
    return "Some details are not valid. Student ID must be 9 digits, the email must end in @mymona.uwi.edu, and the stay must be 15 to 480 minutes.";
  }
  if (e?.code === "42501") {
    return "You do not have permission to do that. Log in as library staff.";
  }
  return e?.message || "Something went wrong. Please try again.";
}

// Returns the logged-in user's staff role, or null if they are not staff.
export async function getStaffRole(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("staff")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data?.role ?? null;
}

// Active sessions, newest first. Optional search by student ID (digits only).
export async function getActiveSessions(
  search?: string
): Promise<ActiveSession[]> {
  let query = supabase
    .from("library_sessions")
    .select(
      "id, student_id, student_email, check_in, allotted_minutes, zone, bag_number, visit_reason, status"
    )
    .eq("status", "active")
    .order("check_in", { ascending: false });

  const term = (search ?? "").replace(/\D/g, "");
  if (term) query = query.ilike("student_id", `%${term}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ActiveSession[];
}

// Closes one active session. Uses the staff_check_out database function.
export async function staffCheckOut(sessionId: string): Promise<void> {
  const { data, error } = await supabase.rpc("staff_check_out", {
    p_session_id: sessionId,
  });
  if (error) throw error;
  if (data !== true) {
    throw new Error(
      "That session could not be closed. It may already be closed."
    );
  }
}

// Staff-assisted check-in for a student without a device.
// Do NOT chain .select() onto the insert.
export async function staffCheckIn(input: StaffCheckInInput): Promise<void> {
  const { error } = await supabase.from("library_sessions").insert({
    student_id: input.studentId.trim(),
    student_email: input.email.trim().toLowerCase(),
    allotted_minutes: input.minutes,
    zone: input.zone,
    visit_reason: input.reason?.trim() || null,
    bag_number: input.bagNumber?.trim() || null,
  });
  if (error) throw error;
}