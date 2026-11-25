"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import { getBags, getOccupancy, getSessions, type Bag, type Session } from "../../lib/api";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [occupancy, setOccupancy] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [bags, setBags] = useState<Bag[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    let active = true;
    async function loadDashboard() {
      try {
        const [nextOccupancy, nextSessions, nextBags] = await Promise.all([
          getOccupancy(),
          getSessions("active"),
          getBags(),
        ]);
        if (!active) return;
        setOccupancy(nextOccupancy);
        setSessions(nextSessions);
        setBags(nextBags);
        setError("");
      } catch (caught) {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "Unable to load the dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();
    const interval = setInterval(() => void loadDashboard(), 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [profile]);

  return (
    <main className="min-h-screen bg-[#F6F7F9] p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#A6533D]">LIBFLOW</p>
            <h1 className="mt-1 text-3xl font-bold text-[#17233C]">Staff Dashboard</h1>
          </div>
          <nav className="flex gap-3 text-sm font-semibold">
            <Link className="rounded-lg border px-3 py-2 hover:bg-white" href="/live-sessions">Live sessions</Link>
            <Link className="rounded-lg border px-3 py-2 hover:bg-white" href="/bag-check">Bag checks</Link>
          </nav>
        </header>

        {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}

        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Current occupancy</p>
            <p className="mt-2 text-4xl font-bold text-[#17233C]">{loading ? "..." : occupancy ?? 0}</p>
          </article>
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Active sessions</p>
            <p className="mt-2 text-4xl font-bold text-[#17233C]">{loading ? "..." : sessions.length}</p>
          </article>
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Active bags</p>
            <p className="mt-2 text-4xl font-bold text-[#17233C]">{loading ? "..." : bags.length}</p>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold text-[#17233C]">Active sessions</h2>
          </div>
          {sessions.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">{loading ? "Loading sessions..." : "No active sessions."}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-gray-500">
                  <tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Zone</th><th className="px-5 py-3">Bag</th><th className="px-5 py-3">Checked in</th></tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-b last:border-0">
                      <td className="px-5 py-3 font-medium">{session.student_id}</td>
                      <td className="px-5 py-3">{session.zone || "-"}</td>
                      <td className="px-5 py-3">{session.bag_number || "-"}</td>
                      <td className="px-5 py-3">{new Date(session.check_in).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}