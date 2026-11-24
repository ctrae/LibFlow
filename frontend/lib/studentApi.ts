import {
  getSession,
  checkOutBySession,
} from "./api";

import type { StudentSession } from "../types/student";

const STUDENT_SESSION_KEY = "libflow_student_session_id";

export function setCurrentStudentSession(sessionId: string) {
  sessionStorage.setItem(STUDENT_SESSION_KEY, sessionId);
}

export function getCurrentStudentSessionId(): string | null {
  return sessionStorage.getItem(STUDENT_SESSION_KEY);
}

export function clearCurrentStudentSession() {
  sessionStorage.removeItem(STUDENT_SESSION_KEY);
}

export async function getCurrentStudentSession(): Promise<StudentSession | null> {
  const sessionId = getCurrentStudentSessionId();

  if (!sessionId) {
    return null;
  }

  const session = await getSession(sessionId);

  return {
    session_id: session.id,
    student_id: session.student_id,
    check_in_time: session.check_in,
    check_out_time: session.check_out,

    // Backend currently does not return expires_at in SessionResponse.
    // Calculate it from check-in time + allotted minutes.
    expires_at: new Date(
      new Date(session.check_in).getTime() +
        session.allotted_minutes * 60 * 1000
    ).toISOString(),

    duration_minutes: session.allotted_minutes,
    allotted_time: session.allotted_minutes,

    session_status: session.status,
    status: session.status,

    baggage_info: session.bag_number
      ? "Checked In"
      : null,

    bag_number: session.bag_number,
  };
}

export async function checkOutStudent(sessionId: string): Promise<void> {
  await checkOutBySession(sessionId);

  clearCurrentStudentSession();
}