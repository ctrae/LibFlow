"use client";

// Staff dashboard (issue #8). Save this file as:
//   frontend/app/override/page.tsx
// Functionality only: plain HTML elements, no styling (UI polish is #12).

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import {
  type ActiveSession,
  friendlyError,
  getActiveSessions,
  getStaffRole,
  staffCheckIn,
  staffCheckOut,
} from "../../lib/libraryApi";

export default function OverrideDashboard() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  // staff-assisted check-in form
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [zone, setZone] = useState<"Main" | "Basement">("Main");
  const [reason, setReason] = useState("");

  // 1. Only logged-in staff may use this page
  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      try {
        const role = await getStaffRole();
        setAuthorized(role !== null);
      } catch {
        setAuthorized(false);
      }
      setReady(true);
    }
    init();
  }, [router]);

  // 2. Load the active sessions (reloads when the search text changes)
  const load = useCallback(async () => {
    try {
      setSessions(await getActiveSessions(search));
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }, [search]);

  useEffect(() => {
    if (authorized) load();
  }, [authorized, load]);

  // 3. Staff check-out, with a confirmation
  async function handleCheckOut(session: ActiveSession) {
    if (!window.confirm(`Check out student ${session.student_id}?`)) return;
    try {
      await staffCheckOut(session.id);
      setMessage(`Checked out student ${session.student_id}.`);
      await load();
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  // 4. Staff-assisted check-in (student has no device)
  async function handleCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await staffCheckIn({ studentId, email, minutes, zone, reason });
      setMessage(`Checked in student ${studentId}.`);
      setStudentId("");
      setEmail("");
      setReason("");
      await load();
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!ready) return <p>Loading...</p>;

  if (!authorized) {
    return (
      <main>
        <p>
          You are signed in, but you are not set up as library staff. Ask the
          head librarian to add you.
        </p>
        <button onClick={handleLogout}>Log out</button>
      </main>
    );
  }

  return (
    <main>
      <h1>Staff dashboard</h1>
      <button onClick={handleLogout}>Log out</button>

      {message && <p role="status">{message}</p>}

      <h2>Active sessions ({sessions.length})</h2>
      <input
        placeholder="Search by student ID"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <button onClick={load}>Refresh</button>

      {sessions.length === 0 ? (
        <p>No active sessions.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Email</th>
              <th>Checked in</th>
              <th>Minutes</th>
              <th>Zone</th>
              <th>Bag</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>{s.student_id}</td>
                <td>{s.student_email}</td>
                <td>{new Date(s.check_in).toLocaleTimeString()}</td>
                <td>{s.allotted_minutes}</td>
                <td>{s.zone ?? ""}</td>
                <td>{s.bag_number ?? ""}</td>
                <td>
                  <button onClick={() => handleCheckOut(s)}>Check out</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Check in a student without a device</h2>
      <form onSubmit={handleCheckIn}>
        <label>
          Student ID{" "}
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            maxLength={9}
            required
          />
        </label>
        <br />
        <label>
          Email{" "}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@mymona.uwi.edu"
            required
          />
        </label>
        <br />
        <label>
          Minutes{" "}
          <input
            type="number"
            min={15}
            max={480}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            required
          />
        </label>
        <br />
        <label>
          Zone{" "}
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value as "Main" | "Basement")}
          >
            <option value="Main">Main</option>
            <option value="Basement">Basement</option>
          </select>
        </label>
        <br />
        <label>
          Reason for visit{" "}
          <input value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <br />
        <button type="submit">Check in</button>
      </form>
    </main>
  );
}