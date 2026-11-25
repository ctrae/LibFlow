"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getEvents, getSessions, type Session, type SessionEvent } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  CHART_COLOR,
  errorMessage,
  formatLongDate,
  formatTime,
  isMainZone,
  libraryDate,
  maskId,
  zoneLabel,
} from "./format";
import { StatusBadge } from "./StatusBadge";

const REFRESH_MS = 30_000;

type ActivityFilter = "all" | "entry" | "exit";

export default function Dashboard() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: () => getSessions(),
    refetchInterval: REFRESH_MS,
  });
  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: () => getEvents(),
    refetchInterval: REFRESH_MS,
  });

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const stats = useMemo(() => {
    const active = sessions.filter((s) => s.status === "active");
    const today = libraryDate();
    return {
      active: active.length,
      main: active.filter((s) => isMainZone(s.zone)).length,
      basement: active.filter((s) => s.zone === "Basement").length,
      today: sessions.filter((s) => libraryDate(new Date(s.check_in)) === today).length,
    };
  }, [sessions]);

  const error = sessionsQuery.error ?? eventsQuery.error;
  const name = profile?.email?.split("@")[0] ?? "";
  const role = profile?.role === "head_librarian" ? "Head Librarian" : "Library Staff";

  return (
    <div className="min-h-screen text-[#2C221E] flex flex-col selection:bg-[#9B4531] selection:text-white">
      <main className="flex-1 space-y-8">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#9B4531] uppercase">
            {formatLongDate()}
          </p>
          <h1 className="text-4xl font-bold text-[#2C221E] mt-1">Welcome{name ? `, ${name}` : ""}.</h1>
          <p className="text-sm text-[#7D6E62] mt-1">
            {role} · Live library activity, refreshed every 30 seconds.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-[#e2bcae] bg-[#fffaf2] p-4 text-sm text-[#9a4638]">
            {errorMessage(error)}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Active sessions" value={stats.active} hint="Currently in the library" loading={sessionsQuery.isLoading} />
          <StatCard label="Main section" value={stats.main} hint="Active sessions" loading={sessionsQuery.isLoading} />
          <StatCard label="Basement" value={stats.basement} hint="Active sessions" loading={sessionsQuery.isLoading} />
          <StatCard label="Visits today" value={stats.today} hint="Registered today" loading={sessionsQuery.isLoading} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-6">
            {/* "Now" = when the sessions were last fetched (refreshes every 30 s) */}
            <RecentRegistrations sessions={sessions} loading={sessionsQuery.isLoading} now={sessionsQuery.dataUpdatedAt} />
            <RecentActivity
              events={eventsQuery.data ?? []}
              sessions={sessions}
              filter={filter}
              onFilter={setFilter}
              loading={eventsQuery.isLoading}
            />
          </div>

          <div className="xl:col-span-4 space-y-6">
            <div className="bg-white p-6 shadow-sm space-y-3">
              <p className="text-[11px] font-bold text-[#9B4531] tracking-wider uppercase">Student check-in</p>
              <p className="text-xs text-[#6E5E52] leading-relaxed">
                Students register a visit on the check-in page. Open it on the entrance device or share the link.
              </p>
              <Link
                href="/check-in"
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#9B4531] hover:underline pt-1"
              >
                Open registration page →
              </Link>
            </div>

            <div className="bg-white p-6 shadow-sm space-y-5">
              <div>
                <h3 className="font-bold text-[#2C221E] text-base">Zone occupancy</h3>
                <p className="text-xs text-[#7D6E62] mt-0.5">Current active sessions by area</p>
              </div>
              <ZoneBar label="Main section" count={stats.main} total={stats.active} />
              <ZoneBar label="Basement" count={stats.basement} total={stats.active} />
              <Link
                href="?tab=Sessions"
                className="w-full py-2.5 rounded-full border border-[#DCD0C0] text-xs font-semibold text-[#2C221E] hover:bg-[#EBE0D3]/50 transition-colors flex items-center justify-center"
              >
                View live sessions ↗
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, hint, loading }: { label: string; value: number; hint: string; loading: boolean }) {
  return (
    <div className="bg-white p-5 shadow-sm flex flex-col justify-between min-h-[120px]">
      <span className="text-xs text-[#7D6E62] font-medium">{label}</span>
      <div>
        <p className="text-3xl font-bold text-[#2C221E] leading-tight">{loading ? "…" : value}</p>
        <p className="text-[11px] text-[#7D6E62] mt-0.5">{hint}</p>
      </div>
    </div>
  );
}

function ZoneBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-medium text-[#2C221E]">
        <span>{label}</span>
        <span>{count}</span>
      </div>
      <div
        className="w-full h-2 bg-[#EBE0D3] rounded-full overflow-hidden"
        role="progressbar"
        aria-label={`${label} occupancy`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CHART_COLOR }} />
      </div>
      <p className="text-[11px] text-[#8C7C6D]">{pct}% of active sessions</p>
    </div>
  );
}

/** Check-ins per hour over the last 12 hours. */
function RecentRegistrations({ sessions, loading, now }: { sessions: Session[]; loading: boolean; now: number }) {
  const data = useMemo(() => {
    const hour = 60 * 60 * 1000;
    return Array.from({ length: 12 }, (_, i) => {
      const end = now - (11 - i) * hour;
      const start = end - hour;
      return {
        label: i === 11 ? "Now" : `${11 - i}h ago`,
        range: `${formatTime(new Date(start).toISOString())} – ${formatTime(new Date(end).toISOString())}`,
        checkIns: sessions.filter((s) => {
          const t = new Date(s.check_in).getTime();
          return t > start && t <= end;
        }).length,
      };
    });
  }, [sessions, now]);
  const total = data.reduce((sum, d) => sum + d.checkIns, 0);

  return (
    <div className="bg-white p-6 shadow-sm">
      <h3 className="font-bold text-[#2C221E] text-base">Recent visit registrations</h3>
      <p className="text-xs text-[#7D6E62] mt-0.5">
        Check-ins per hour, last 12 hours · {loading ? "…" : `${total} total`}
      </p>
      <div className="mt-6 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#EFE7DC" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8C7C6D" }} tickLine={false} axisLine={{ stroke: "#E3D7C7" }} interval={1} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8C7C6D" }} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "#F5EFE6" }}
              formatter={(value) => [value, "Check-ins"]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.range ?? ""}
            />
            <Bar dataKey="checkIns" fill={CHART_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RecentActivity({
  events,
  sessions,
  filter,
  onFilter,
  loading,
}: {
  events: SessionEvent[];
  sessions: Session[];
  filter: ActivityFilter;
  onFilter: (f: ActivityFilter) => void;
  loading: boolean;
}) {
  const byId = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions]);
  const rows = events
    .filter((e) =>
      filter === "all" ? true : filter === "entry" ? e.event_status === "active" : e.event_status !== "active",
    )
    .slice(0, 10);

  const pills: { key: ActivityFilter; label: string }[] = [
    { key: "all", label: "All activity" },
    { key: "entry", label: "Entry" },
    { key: "exit", label: "Exit" },
  ];

  return (
    <div className="bg-white p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#2C221E] text-base">Recent visit activity</h3>
          <p className="text-xs text-[#7D6E62] mt-0.5">Latest entries and exits from the audit log</p>
        </div>
        <div className="flex items-center gap-1 bg-[#EBE0D3] p-1 rounded-full text-xs">
          {pills.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onFilter(p.key)}
              className={
                filter === p.key
                  ? "bg-[#2C221E] text-white px-3 py-1 rounded-full font-medium"
                  : "text-[#6E5E52] px-3 py-1 rounded-full hover:text-[#2C221E] transition-colors"
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[#7D6E62]">Loading activity…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[#7D6E62]">No activity yet.</p>
      ) : (
        <ul className="divide-y divide-[#EFE7DC] border-t border-[#E3D7C7]/60">
          {rows.map((e) => {
            const s = byId.get(e.session_id);
            return (
              <li key={e.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <StatusBadge status={e.event_status} />
                  <span className="font-mono text-xs text-[#6E5E52]">{s ? maskId(s.student_id) : "—"}</span>
                  <span className="text-xs text-[#8C7C6D]">{zoneLabel(e.zone ?? s?.zone)}</span>
                </div>
                <span className="text-xs text-[#8C7C6D]">{formatTime(e.created_at)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
