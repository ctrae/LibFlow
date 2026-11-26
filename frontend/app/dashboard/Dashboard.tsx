"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, getSessions, type Session } from "@/lib/api";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  CLOSE_MINUTES,
  OPEN_MINUTES,
  OPENING_HOURS_LABEL,
  formatClock,
  isShownToday,
  isToday,
  todayOpeningWindow,
  todayWindow,
} from "@/lib/openingHours";

/** The API stores "Main"; older rows used "Main section". */
const isMainZone = (zone: string | null) => zone === "Main" || zone === "Main section";

export default function Dashboard() {
  const [allSessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState<
    "all" | "entry" | "exit"
  >("all");
  // AdminShell only renders this tab once a staff user is signed in.
  const { user } = useAuth();

  // Today's opening-hours sessions, plus anyone still checked in (so the
  // active counts and zone occupancy never miss someone inside).
  const sessions = useMemo(() => {
    const window = todayWindow();
    return allSessions.filter((s) => isShownToday(s, window));
  }, [allSessions]);

  // Everyone who checked in today, at any time (Visits today card).
  const todayCheckIns = useMemo(() => {
    const window = todayWindow();
    return sessions.filter((s) => isToday(s.check_in, window));
  }, [sessions]);

  const activity = useMemo(() => {
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime(),
    );

    const rows: {
      id: string;
      kind: "entry" | "exit";
      at: string;
      label: "Check in" | "Exited" | "Expired";
      student: string;
      minutes: number;
      zone: string;
    }[] = [];
    for (const s of sorted) {
      const base = {
        student: s.student_id,
        minutes: s.allotted_minutes,
        zone: isMainZone(s.zone) ? "Main" : (s.zone ?? "—"),
      };
      if (isToday(s.check_in)) {
        rows.push({ ...base, id: `${s.id}-in`, kind: "entry", at: s.check_in, label: "Check in" });
      }

      // Exited: when they checked out. Expired: when their time ran out.
      const endedAt = s.check_out ?? (s.status === "expired" ? s.expires_at : null);
      if (endedAt && s.status !== "active" && isToday(endedAt)) {
        rows.push({
          ...base,
          id: `${s.id}-out`,
          kind: "exit",
          at: endedAt,
          label: s.status === "expired" ? "Expired" : "Exited",
        });
      }
    }

    rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const filtered =
      activityFilter === "all"
        ? rows
        : rows.filter((r) => r.kind === activityFilter);
    return filtered.slice(0, 8);
  }, [sessions, activityFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getSessions();
        if (!cancelled) setSessions(data);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Unable to load dashboard.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Refresh every 5 seconds so the live count updates within 5 s (SR-04.4).
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        setSessions(await getSessions());
      } catch {
        // Keep the last data on screen; the next tick tries again.
      }
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    const active = sessions.filter((s) => s.status === "active");
    const mainActive = active.filter((s) => isMainZone(s.zone)).length;
    const basementActive = active.filter((s) => s.zone === "Basement").length;

    const visitsToday = todayCheckIns.length;

    return {
      activeCount: active.length,
      mainActive,
      basementActive,
      visitsToday,
    };
  }, [sessions, todayCheckIns]);
  // Today's check-ins, one bar per hour of library opening time.
  const hourly = useMemo(() => {
    const { start, end } = todayOpeningWindow();
    const slots = Math.ceil((CLOSE_MINUTES - OPEN_MINUTES) / 60);

    const buckets = Array.from({ length: slots }, (_, i) => ({
      label: formatClock(OPEN_MINUTES + i * 60),
      count: 0,
    }));

    // The chart alone is limited to opening hours.
    for (const s of todayCheckIns) {
      const t = new Date(s.check_in).getTime();
      if (t < start || t >= end) continue;
      buckets[Math.floor((t - start) / 3600_000)].count += 1;
    }

    const max = Math.max(1, ...buckets.map((b) => b.count));
    return { buckets, max };
  }, [todayCheckIns]);

  const zoneSplit = useMemo(() => {
    const active = sessions.filter((s) => s.status === "active");
    const total = active.length || 1; // avoid /0
    const main = active.filter((s) => isMainZone(s.zone)).length;
    const basement = active.filter((s) => s.zone === "Basement").length;
    return {
      main,
      basement,
      total: active.length,
      mainPct: Math.round((main / total) * 100),
      basementPct: Math.round((basement / total) * 100),
    };
  }, [sessions]);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "Staff";

  return (
    <div className="min-h-screen text-[#2C221E] flex flex-col selection:bg-[#9B4531] selection:text-white">
      <div className="flex flex-1">
        {/* Main Content Area */}
        <main className="flex-1 space-y-8 mx-auto">
          {/* Header Title */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#9B4531] uppercase">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <h1 className="text-4xl font-bold text-[#2C221E] mt-1">
              Welcome, {displayName}
            </h1>
            <p className="text-sm text-[#7D6E62] mt-1">
              Live library activity for today.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="bg-white p-5 w-[285px] h-[116px] shadow-sm flex flex-col justify-between h-[135px]">
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#7D6E62] font-medium">
                  Active sessions
                </span>
                <svg
                  className="w-5 h-5 text-[#9B4531]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#2C221E] leading-tight">
                  {loading ? "—" : stats.activeCount}
                </p>
                <p className="text-[11px] text-[#7D6E62] mt-0.5">
                  Currently active
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-5 w-[285px] h-[116px] shadow-sm flex flex-col justify-between h-[135px]">
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#7D6E62] font-medium">
                  Main section
                </span>
                <svg
                  className="w-5 h-5 text-[#9B4531]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H7m4 0V7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#2C221E] leading-tight">
                  {loading ? "—" : stats.mainActive}
                </p>
                <p className="text-[11px] text-[#7D6E62] mt-0.5">
                  Active sessions
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-5 w-[285px] h-[116px] shadow-sm flex flex-col justify-between h-[135px]">
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#7D6E62] font-medium">
                  Basement
                </span>
                <svg
                  className="w-5 h-5 text-[#9B4531]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#2C221E] leading-tight">
                  {loading ? "—" : stats.basementActive}
                </p>
                <p className="text-[11px] text-[#7D6E62] mt-0.5">
                  Active sessions
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white p-5 w-[285px] h-[116px] shadow-sm flex flex-col justify-between h-[135px]">
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#7D6E62] font-medium">
                  Visits today
                </span>
                <svg
                  className="w-5 h-5 text-[#9B4531]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#2C221E] leading-tight">
                  {loading ? "—" : stats.visitsToday}
                </p>
                <p className="text-[11px] text-[#7D6E62] mt-0.5">
                  Registered today
                </p>
              </div>
            </div>
          </div>

          {/* Main Dashboard Layout (2 Columns) */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column (Chart & Activity) */}
            <div className="col-span-8 space-y-6">
              {/* Recent visit registrations */}
              <div className="bg-white p-6 shadow-sm">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#9B4531]"></span>
                  <h3 className="font-bold text-[#2C221E] text-base">
                    Recent visit registrations
                  </h3>
                </div>
                <p className="text-xs text-[#7D6E62] mt-0.5">
                  Visits registered today, per hour of opening time ({OPENING_HOURS_LABEL})
                </p>

                {/* Graph Container */}
                <div className="mt-6 border border-[#E3D7C7]/70 rounded-xl bg-[#F5EFE6]/50 h-[220px] flex flex-col justify-end p-4">
                  <div className="flex items-end gap-1 sm:gap-2 h-[150px] border-b border-[#E3D7C7]/60">
                    {hourly.buckets.map((b) => (
                      <div
                        key={b.label}
                        className="flex-1 min-w-0 flex flex-col items-center justify-end h-full"
                      >
                        <span
                          className={`text-[11px] font-semibold mb-1 ${
                            b.count ? "text-[#2C221E]" : "text-[#B5A797]"
                          }`}
                        >
                          {b.count}
                        </span>
                        <div
                          className="w-full max-w-[36px] bg-[#9B4531] rounded-t-sm transition-all"
                          style={{
                            // Leave room for the count label above the tallest bar.
                            height: `${(b.count / hourly.max) * 80}%`,
                            minHeight: b.count ? 4 : 0,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {/* Labels sit in the same columns as the bars. On narrow
                      screens they tilt so they never spill past the chart. */}
                  <div className="w-full pt-2 h-8 lg:h-auto flex gap-1 sm:gap-2 text-[10px] lg:text-[11px] text-[#8C7C6D]">
                    {hourly.buckets.map((b) => (
                      <span key={b.label} className="flex-1 min-w-0 flex justify-center">
                        <span className="inline-block whitespace-nowrap -rotate-45 lg:rotate-0">
                          {b.label}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (Zone Occupancy) */}
            <div className="col-span-4 space-y-6">

              {/* Zone Occupancy */}
              <div className="bg-white p-6 shadow-sm space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#2C221E] text-base">
                      Zone occupancy
                    </h3>
                    <button className="text-[#8C7C6D] hover:text-[#2C221E]">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-[#7D6E62] mt-0.5">
                    Current active sessions by area
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-[#2C221E]">
                      <span>Main section</span>
                      <span>{zoneSplit.main}</span>
                    </div>
                    <div className="w-full h-2 bg-[#EBE0D3] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#9B4531] rounded-full"
                        style={{ width: `${zoneSplit.mainPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-[#8C7C6D]">
                      {zoneSplit.mainPct}% of active sessions
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-[#2C221E]">
                      <span>Basement</span>
                      <span>{zoneSplit.basement}</span>
                    </div>
                    <div className="w-full h-2 bg-[#EBE0D3] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C08A5B] rounded-full"
                        style={{ width: `${zoneSplit.basementPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-[#8C7C6D]">
                      {zoneSplit.basementPct}% of active sessions
                    </p>
                  </div>
                </div>

                <Link
                  href="/dashboard?tab=Sessions"
                  className="w-full py-2.5 rounded-full border border-[#DCD0C0] text-xs font-semibold text-[#2C221E] hover:bg-[#EBE0D3]/50 transition-colors flex items-center justify-center space-x-1.5 mt-2"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 17L17 7M17 7H7M17 7V17"
                    />
                  </svg>
                  <span>View live sessions</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Recent visit activity (full width) */}
          <div className="bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#2C221E] text-base">
                  Recent visit activity
                </h3>
                <p className="text-xs text-[#7D6E62] mt-0.5">
                  Today&apos;s check-ins and exits
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center space-x-1 bg-[#EBE0D3] p-1 rounded-full text-xs">
                <button
                  onClick={() => setActivityFilter("all")}
                  className={
                    activityFilter === "all"
                      ? "bg-[#2C221E] text-white px-3 py-1 rounded-full font-medium"
                      : "text-[#6E5E52] px-3 py-1 rounded-full hover:text-[#2C221E] transition-colors"
                  }
                >
                  All activity
                </button>

                <button
                  onClick={() => setActivityFilter("entry")}
                  className={
                    activityFilter === "entry"
                      ? "bg-[#2C221E] text-white px-3 py-1 rounded-full font-medium"
                      : "text-[#6E5E52] px-3 py-1 rounded-full hover:text-[#2C221E] transition-colors"
                  }
                >
                  Check in
                </button>

                <button
                  onClick={() => setActivityFilter("exit")}
                  className={
                    activityFilter === "exit"
                      ? "bg-[#2C221E] text-white px-3 py-1 rounded-full font-medium"
                      : "text-[#6E5E52] px-3 py-1 rounded-full hover:text-[#2C221E] transition-colors"
                  }
                >
                  Exited / Expired
                </button>
              </div>
            </div>

            {/* Activity table */}
            <div className="w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fdf3e7] h-[44px]">
                    {["Activity", "Student", "Planned stay", "Zone", "Time"].map((h) => (
                      <th
                        key={h}
                        className="px-4 font-bold text-[13px] text-[#8c6753] tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activity.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-xs text-[#8C7C6D]">
                        No activity today yet.
                      </td>
                    </tr>
                  ) : (
                    activity.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-[#edf2f7] h-[48px] hover:bg-gray-50/50 transition-colors text-sm"
                      >
                        <td className="px-4 font-medium text-[#2C221E] whitespace-nowrap">{r.label}</td>
                        <td className="px-4 text-[#2C221E] whitespace-nowrap">{r.student}</td>
                        <td className="px-4 text-[#4a5568] whitespace-nowrap">{r.minutes} min</td>
                        <td className="px-4 text-[#4a5568] whitespace-nowrap">{r.zone}</td>
                        <td className="px-4 text-xs text-[#8C7C6D] whitespace-nowrap">
                          {new Date(r.at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Floating Bottom Right Button */}
      <div className="fixed bottom-6 right-6">
        <button className="w-10 h-10 rounded-full bg-[#2C221E] text-white font-bold text-sm flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
          N
        </button>
      </div>
    </div>
  );
}
