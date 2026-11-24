import { supabase } from "./supabaseClient";
import type { StudentSession } from "../types/student";

const STUDENT_SESSION_KEY = "libflow_student_session_id";

/**
 * Store the current student's LIBFLOW session ID.
 *
 * We store the session UUID, NOT the student's ID.
 * This means the student's ID is never exposed in the URL.
 */
export function setCurrentStudentSession(sessionId: string) {
  sessionStorage.setItem(STUDENT_SESSION_KEY, sessionId);
}

/**
 * Get the session ID belonging to the current browser session.
 */
export function getCurrentStudentSessionId(): string | null {
  return sessionStorage.getItem(STUDENT_SESSION_KEY);
}

/**
 * Remove the current student session from the browser.
 */
export function clearCurrentStudentSession() {
  sessionStorage.removeItem(STUDENT_SESSION_KEY);
}

/**
 * Retrieve the currently checked-in student's session.
 *
 * The dashboard does NOT accept a student ID.
 * It uses the session created during check-in.
 */
export async function getCurrentStudentSession(): Promise<StudentSession | null> {
  const sessionId = getCurrentStudentSessionId();

  if (!sessionId) {
    return null;
  }

  const { data, error } = await supabase
    .from("library_sessions")
    .select(
      `
      session_id,
      student_id,
      check_in_time,
      check_out_time,
      expires_at,
      duration_minutes,
      allotted_time,
      session_status,
      status,
      baggage_info,
      bag_number
      `
    )
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching student session:", error);
    throw error;
  }

  return data;
}

/**
 * Check the current student out of the library.
 */
export async function checkOutStudent(
  sessionId: string
): Promise<void> {
  const checkOutTime = new Date().toISOString();

  const { error } = await supabase
    .from("library_sessions")
    .update({
      check_out_time: checkOutTime,
      session_status: "exited",
      status: "exited",
      updated_at: checkOutTime,
    })
    .eq("session_id", sessionId);

  if (error) {
    console.error("Error checking out student:", error);
    throw error;
  }

  clearCurrentStudentSession();
}