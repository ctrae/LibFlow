"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, checkIn, staffCheckIn, type Zone } from "@/lib/api";
import { setCurrentStudentSession } from "@/lib/studentApi";
import { useAuth } from "@/hooks/useAuth";

const QUICK_MINUTES = [15, 30, 45, 60];

export default function CheckInPage() {
  return (
    <Suspense fallback={null}>
      <CheckInForm />
    </Suspense>
  );
}

function CheckInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  // Staff mode needs BOTH a signed-in staff account and an explicit ?staff=1
  // (the dashboard link). Students, or a kiosk left signed in, get the plain form.
  // The backend checks the staff token again on /staff/check-in.
  const staffMode = Boolean(profile) && searchParams.get("staff") === "1";
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [minutes, setMinutes] = useState("");
  const [zone, setZone] = useState<Zone>("Main");
  const [checkingBag, setCheckingBag] = useState<"No" | "Yes">("No");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanId = studentId.trim();
    const stayMinutes = Number(minutes);

    if (!cleanEmail.endsWith("@mymona.uwi.edu")) {
      setMessage("Please use your @mymona.uwi.edu email.");
      return;
    }

    if (!/^\d{9}$/.test(cleanId)) {
      setMessage("Student ID must be 9 digits.");
      return;
    }

    if (!Number.isInteger(stayMinutes) || stayMinutes < 15 || stayMinutes > 480) {
      setMessage("Approximate stay must be between 15 and 480 minutes.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        student_id: cleanId,
        student_email: cleanEmail,
        allotted_minutes: stayMinutes,
        zone,
        checking_bag: checkingBag === "Yes",
      };
      const result = staffMode ? await staffCheckIn(payload) : await checkIn(payload);

      if (!result.session_id) {
        setMessage("Check-in succeeded, but no session ID was returned.");
        return;
      }

      setEmail("");
      setStudentId("");
      setMinutes("");
      setCheckingBag("No");

      if (staffMode) {
        // Stay on the form for the next student; the session is not this browser's.
        setSuccess(
          result.bag_number
            ? `Checked in student ${result.student_id}. Give them bag tag ${result.bag_number}.`
            : `Checked in student ${result.student_id}.`,
        );
        return;
      }

      setCurrentStudentSession(result.session_id);
      router.push("/student");
    } catch (err) {
      const errorText =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Could not register visit.";
      setMessage(`Could not register visit: ${errorText}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f7f3ec",
        padding: "2rem 1rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: "460px", margin: "0 auto 0.75rem" }}>
        {staffMode && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              backgroundColor: "#fff3e1",
              border: "1px solid #e2bcae",
              borderRadius: "8px",
              padding: "0.6rem 0.8rem",
              marginBottom: "0.75rem",
              fontSize: "0.8rem",
              color: "#5b2924",
            }}
          >
            <span>
              <strong>Staff override</strong> · opening-hours check skipped
            </span>
            <Link href="/dashboard" style={{ fontWeight: 600, color: "#9a441b", whiteSpace: "nowrap" }}>
              ← Back to dashboard
            </Link>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.7rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#7a6f64",
            marginBottom: "0.5rem",
          }}
        >
          <span style={{ fontWeight: 700, color: "#1f2d5a" }}>LIBFLOW</span>
          <span>FST Library student entry</span>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: "460px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          border: "1px solid #e7dfd3",
          borderRadius: "10px",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 0.25rem",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#9a441b",
            }}
          >
            {staffMode ? "Staff check-in" : "QR Check-In"}
          </p>
          <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.35rem", color: "#1f2937" }}>
            {staffMode ? "Register a student's visit" : "Register your library visit"}
          </h1>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#6b7280", lineHeight: 1.4 }}>
            Complete this form after scanning the library QR code. Enter your approximate
            stay in minutes (15–480).
          </p>
        </div>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
            fontSize: "0.82rem",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          @mymona.uwi.edu email
          <input
            type="email"
            placeholder="name@mymona.uwi.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: "0.55rem 0.65rem",
              borderRadius: "6px",
              border: "1px solid #d6cec2",
              fontWeight: 400,
            }}
          />
        </label>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
            fontSize: "0.82rem",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          Student ID number
          <input
            type="text"
            placeholder="Nine-digit ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            style={{
              padding: "0.55rem 0.65rem",
              borderRadius: "6px",
              border: "1px solid #d6cec2",
              fontWeight: 400,
            }}
          />
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>
            How long are you staying? (approximate minutes, 15–480)
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem" }}>
            {QUICK_MINUTES.map((preset) => {
              const active = Number(minutes) === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMinutes(String(preset))}
                  style={{
                    padding: "0.4rem",
                    fontSize: "0.78rem",
                    borderRadius: "6px",
                    cursor: "pointer",
                    border: active ? "1px solid #9a441b" : "1px solid #d6cec2",
                    backgroundColor: active ? "#9a441b" : "#faf7f2",
                    color: active ? "#ffffff" : "#374151",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {preset} min
                </button>
              );
            })}
          </div>
          <input
            type="number"
            min={15}
            max={480}
            placeholder="Approximate minutes (e.g. 30)"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            required
            style={{
              padding: "0.55rem 0.65rem",
              borderRadius: "6px",
              border: "1px solid #d6cec2",
            }}
          />
        </div>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
            fontSize: "0.82rem",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          Zone
          <select
            value={zone}
            onChange={(e) => {
              const next = e.target.value as Zone;
              setZone(next);
              // Bag check is Main only; Basement students keep their bags.
              if (next === "Basement") setCheckingBag("No");
            }}
            style={{
              padding: "0.55rem 0.65rem",
              borderRadius: "6px",
              border: "1px solid #d6cec2",
              backgroundColor: "#ffffff",
            }}
          >
            <option value="Main">Main</option>
            <option value="Basement">Basement</option>
          </select>
        </label>

        {zone === "Basement" ? (
          <p style={{ margin: 0, fontSize: "0.78rem", color: "#6b7280" }}>
            No bag check in the Basement. You can keep your bag with you.
          </p>
        ) : (
        <div
          style={{
            backgroundColor: "#faf7f2",
            border: "1px solid #ece5da",
            borderRadius: "6px",
            padding: "0.65rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
          }}
        >
          <label
            htmlFor="checkingBag"
            style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}
          >
            Baggage information — Are you checking a bag? Yes or no?
          </label>
          <select
            id="checkingBag"
            value={checkingBag}
            onChange={(e) => setCheckingBag(e.target.value as "No" | "Yes")}
            style={{
              padding: "0.5rem 0.6rem",
              borderRadius: "6px",
              border: "1px solid #d6cec2",
              backgroundColor: "#ffffff",
            }}
          >
            <option value="No">No — No bag declared</option>
            <option value="Yes">Yes</option>
          </select>

          {checkingBag === "Yes" && (
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#6b7280" }}>
              A bag number will be assigned when you register. It will show on your session page.
            </p>
          )}
        </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "0.65rem 1rem",
            backgroundColor: submitting ? "#b87a5c" : "#9a441b",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Registering..." : "\u2192 Register visit"}
        </button>

        {success && (
          <p role="status" style={{ margin: 0, fontSize: "0.85rem", color: "#065f46" }}>
            {success}
          </p>
        )}

        {message && (
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#1f2937" }}>{message}</p>
        )}
      </form>
    </div>
  );
}