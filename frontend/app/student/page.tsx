"use client";

import { useEffect, useState } from "react";
import {
  checkOutStudent,
  extendStudentStay,
  getCurrentStudentSession,
} from "../../lib/studentApi";
import type { StudentSession } from "../../types/student";

export default function StudentPage() {
  const [session, setSession] = useState<StudentSession | null>(null);

  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(
    null
  );

  const [extensionTime, setExtensionTime] = useState("30");
  const [extendingStay, setExtendingStay] = useState(false);
  const [extensionMessage, setExtensionMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  /*
   * Load the current student's session.
   */
  async function loadSession() {
    try {
      setError("");

      const currentSession = await getCurrentStudentSession();

      setSession(currentSession);
    } catch (error) {
      console.error("Failed to load student session:", error);
      setError("Unable to load your library session.");
    } finally {
      setLoading(false);
    }
  }

  /*
   * Load the session when the page opens.
   *
   * Poll every 5 seconds so the dashboard can notice
   * changes made elsewhere in LIBFLOW.
   */
  useEffect(() => {
    void Promise.resolve().then(() => loadSession());

    const interval = setInterval(
      () => void loadSession(),
      5000
    );

    return () => clearInterval(interval);
  }, []);

  /*
   * Countdown timer.
   */
  useEffect(() => {
    const expiresAt = session?.expires_at;

    if (typeof expiresAt !== "string" || !expiresAt) {
      return;
    }

    const expiryTime = expiresAt;

    function updateRemainingTime() {
      const now = Date.now();
      const expiry = new Date(expiryTime).getTime();

      const difference = expiry - now;

      if (difference <= 0) {
        setRemainingMinutes(0);
        return;
      }

      setRemainingMinutes(
        Math.ceil(difference / 60000)
      );
    }

    updateRemainingTime();

    const timer = setInterval(
      updateRemainingTime,
      1000
    );

    return () => clearInterval(timer);
  }, [session]);

  /*
   * Check the student out.
   */
  async function handleCheckout() {
    if (!session) return;

    const confirmed = window.confirm(
      "Are you sure you want to check out of the library?"
    );

    if (!confirmed) return;

    try {
      setCheckingOut(true);
      setError("");

      await checkOutStudent(
        session.session_id
      );

      setSession(null);
    } catch (error) {
      console.error("Checkout failed:", error);
      setError(
        "Unable to complete checkout. Please try again."
      );
    } finally {
      setCheckingOut(false);
    }
  }

  /*
   * Extend the student's active session.
   *
   * This is an immediate action.
   * There is NO staff approval step.
   */
  async function handleExtendStay() {
    if (!session) return;

    const minutes = Number(extensionTime);

    if (![15, 30, 45, 60].includes(minutes)) {
      setError(
        "Please select a valid extension time."
      );
      return;
    }

    try {
      setExtendingStay(true);
      setError("");
      setExtensionMessage("");

      await extendStudentStay(
        session.session_id,
        minutes
      );

      /*
       * Reload the session so the dashboard gets
       * the new expires_at and allotted_minutes
       * directly from the backend.
       */
      await loadSession();

      setExtensionMessage(
        `${minutes} minutes added to your session.`
      );
    } catch (error) {
      console.error(
        "Extend stay failed:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to extend your stay. Please try again."
      );
    } finally {
      setExtendingStay(false);
    }
  }

  /* =========================================================
     LOADING
     ========================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5F0E8] px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-[#17233C]">
            Loading your session...
          </p>
        </div>
      </main>
    );
  }

  /* =========================================================
     ERROR
     ========================================================= */

  if (error && !session) {
    return (
      <main className="min-h-screen bg-[#F5F0E8] px-4 py-8">
        <div className="mx-auto max-w-2xl">

          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#A6533D]">
            LIBFLOW
          </p>

          <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm">

            <h1 className="text-xl font-bold text-[#17233C]">
              Unable to Load Session
            </h1>

            <p className="mt-2 text-gray-600">
              {error}
            </p>

          </div>

        </div>
      </main>
    );
  }

  /* =========================================================
     NO ACTIVE SESSION
     ========================================================= */

  if (!session) {
    return (
      <main className="min-h-screen bg-[#F5F0E8] px-4 py-8">
        <div className="mx-auto max-w-2xl">

          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#A6533D]">
            LIBFLOW
          </p>

          <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm">

            <h1 className="text-xl font-bold text-[#17233C]">
              No Active Session
            </h1>

            <p className="mt-2 text-gray-600">
              There is no active library session associated with
              this check-in.
            </p>

          </div>

        </div>
      </main>
    );
  }

  const isExpired =
    remainingMinutes !== null &&
    remainingMinutes <= 0;

  /* =========================================================
     DASHBOARD
     ========================================================= */

  return (
    <main className="min-h-screen bg-[#F5F0E8] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">

        {/* HEADER */}

        <header className="mb-8">

          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#A6533D]">
            LIBFLOW
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#17233C]">
            Student Dashboard
          </h1>

        </header>

        {/* STUDENT ID */}

        <section className="mb-5 rounded-2xl bg-white p-6 shadow-sm">

          <p className="text-sm font-medium text-gray-500">
            Student ID
          </p>

          <p className="mt-1 text-2xl font-bold tracking-wide text-[#17233C]">
            {session.student_id}
          </p>

        </section>

        {/* SESSION STATUS */}

        <section className="mb-5 rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <h2 className="text-xl font-bold text-[#17233C]">
              Session Status
            </h2>

            <span
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
                isExpired
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >

              <span
                className={`h-2 w-2 rounded-full ${
                  isExpired
                    ? "bg-red-500"
                    : "bg-green-500"
                }`}
              />

              {isExpired
                ? "EXPIRED"
                : "ACTIVE"}

            </span>

          </div>

          {/* TIME REMAINING */}

          <div className="mt-6 rounded-2xl bg-[#F8E8DF] px-5 py-7 text-center">

            <p className="text-sm font-medium text-gray-600">
              Time Remaining
            </p>

            <p className="mt-2 text-5xl font-bold tracking-tight text-[#A6533D]">
              {remainingMinutes !== null
                ? remainingMinutes
                : "--"}
            </p>

            <p className="mt-1 text-sm font-medium text-gray-600">
              minutes
            </p>

          </div>

          {/* SESSION TIMES */}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">

            <div>

              <p className="text-sm text-gray-500">
                Check-in Time
              </p>

              <p className="mt-1 font-semibold text-[#17233C]">
                {new Date(
                  session.check_in_time
                ).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>

            </div>

            <div>

              <p className="text-sm text-gray-500">
                Session End Time
              </p>

              <p className="mt-1 font-semibold text-[#17233C]">
                {session.expires_at
                  ? new Date(
                      session.expires_at
                    ).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "--"}
              </p>

            </div>

          </div>

        </section>

        {/* BAG INFORMATION */}

        <section className="mb-5 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold text-[#17233C]">
            Bag Information
          </h2>

          {session.bag_number ? (
            <>
              <div className="mt-5">

                <p className="text-sm text-gray-500">
                  Bag Status
                </p>

                <div className="mt-1 flex items-center gap-2">

                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />

                  <p className="font-semibold text-[#17233C]">
                    Checked In
                  </p>

                </div>

              </div>

              <div className="mt-5 rounded-xl bg-[#F8E8DF] p-4">

                <p className="text-sm text-gray-500">
                  Bag Tag Number
                </p>

                <p className="mt-1 text-2xl font-bold tracking-wide text-[#A6533D]">
                  {session.bag_number}
                </p>

              </div>
            </>
          ) : (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-gray-50 p-4">

              <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />

              <p className="text-sm font-medium text-gray-600">
                No bag declared
              </p>

            </div>
          )}

        </section>

        {/* EXTEND STAY */}

        {!isExpired && (
          <section className="mb-5 rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-xl font-bold text-[#17233C]">
              Extend Your Stay
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Need more time in the library?
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">

              <select
                value={extensionTime}
                onChange={(event) => {
                  setExtensionTime(
                    event.target.value
                  );
                  setExtensionMessage("");
                }}
                disabled={extendingStay}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-[#17233C] outline-none focus:border-[#A6533D] focus:ring-2 focus:ring-[#A6533D]/20 disabled:bg-gray-100"
              >

                <option value="15">
                  15 minutes
                </option>

                <option value="30">
                  30 minutes
                </option>

                <option value="45">
                  45 minutes
                </option>

                <option value="60">
                  60 minutes
                </option>

              </select>

              <button
                type="button"
                onClick={handleExtendStay}
                disabled={extendingStay}
                className="rounded-xl bg-[#A6533D] px-5 py-3 font-semibold text-white transition hover:bg-[#8F4634] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
              >
                {extendingStay
                  ? "Extending..."
                  : "Extend Stay"}
              </button>

            </div>

            {/* EXTENSION STATUS */}

            <div className="mt-5 border-t border-gray-100 pt-5">

              <p className="text-sm text-gray-500">
                Extension Status
              </p>

              <p
                className={`mt-1 font-semibold ${
                  extensionMessage
                    ? "text-green-600"
                    : "text-gray-700"
                }`}
              >
                {extensionMessage ||
                  "No extension applied"}
              </p>

            </div>

          </section>
        )}

        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* CHECK OUT */}

        {!isExpired && (
          <button
            type="button"
            onClick={handleCheckout}
            disabled={checkingOut}
            className="w-full rounded-2xl bg-[#A6533D] px-6 py-4 text-lg font-bold text-white shadow-sm transition hover:bg-[#8F4634] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkingOut
              ? "Checking Out..."
              : "Check Out"}
          </button>
        )}

        {/* EXPIRED */}

        {isExpired && (
          <div className="rounded-2xl bg-red-50 p-5 text-center">

            <p className="font-semibold text-red-700">
              Your library session has expired.
            </p>

            <p className="mt-1 text-sm text-red-600">
              Your session will be closed automatically.
            </p>

          </div>
        )}

      </div>
    </main>
  );
}