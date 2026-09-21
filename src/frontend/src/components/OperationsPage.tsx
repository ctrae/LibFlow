'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpenCheck, Check, ClipboardCheck, Download, Filter, LineChart, Loader2, RefreshCw, Search, Users, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { getAdminSessions, LibrarySession, LibraryZone, SessionStatus, updateAdminStatus } from '@/lib/libraryApi';

export type OperationsView = 'sessions' | 'bags' | 'analytics';

const demoSessions: LibrarySession[] = [
  { id: 'demo-1', name: 'Amara Lewis', email: 'amara@mymona.uwi.edu', student_id: '000004821', short_code: 'AM42', duration_minutes: 60, baggage_info: 'No bag declared', zone: 'Main section', status: 'inside', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 35 * 60000).toISOString(), updated_at: new Date().toISOString() },
];

export function OperationsPage({ view }: { view: OperationsView }) {
  const router = useRouter();
  const [sessions, setSessions] = useState<LibrarySession[]>([]);
  const [query, setQuery] = useState('');
  const [completedBags, setCompletedBags] = useState<string[]>([]);
  const [range, setRange] = useState('Today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadSessions() {
    setLoading(true);
    setError('');
    try { setSessions(await getAdminSessions()); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load live library data'); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadSessions(); }, []);

  const title = view === 'sessions' ? 'Live sessions' : view === 'bags' ? 'Bag checks' : 'Analytics';
  const description = view === 'sessions' ? 'Track active library sessions and zone transitions as they happen.' : view === 'bags' ? 'Review held bags and close out claims at the main exit.' : 'Understand traffic patterns and daily library usage.';
  const visibleSessions = sessions.filter((session) => [session.name, session.student_id, session.short_code, session.zone || '', session.status].some((value) => value.toLowerCase().includes(query.toLowerCase())));
  const bagRows = sessions.filter((session) => session.baggage_info !== 'No bag declared' && session.status !== 'exited');
  const activeSessions = sessions.filter((session) => session.status === 'inside');
  const mainCount = activeSessions.filter((session) => session.zone === 'Main section').length;
  const basementCount = activeSessions.filter((session) => session.zone === 'Basement').length;
  const chartPoints = useMemo(() => buildChart(sessions, range), [range, sessions]);

  async function updateBag(session: LibrarySession) {
    const updated = await updateAdminStatus(session.id, session.zone || 'Main section', 'exited');
    setSessions((current) => current.map((item) => item.id === updated.id ? updated : item));
    setCompletedBags((current) => [...current, session.id]);
  }

  return <div className="library-page min-h-screen bg-[#f3eadb]"><Header /><main className="mx-auto max-w-[1280px] px-5 py-7 lg:px-10"><button type="button" onClick={() => router.push('/')} className="mb-7 flex items-center gap-2 text-sm font-medium text-[#765d4c] hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to overview</button><div className="mb-8 flex flex-col gap-4 border-b border-[#d8c8b2] pb-6 md:flex-row md:items-end md:justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">TrackSys / Operations</p><h1 className="font-display text-3xl font-semibold text-[#3d281f] md:text-4xl">{title}</h1><p className="mt-2 max-w-xl text-sm text-[#765d4c]">{description}</p></div><button type="button" onClick={loadSessions} className="inline-flex items-center gap-2 rounded-lg border border-[#d8c8b2] bg-[#fffaf2] px-3 py-2 text-xs font-semibold text-[#765d4c]"><RefreshCw className="h-4 w-4" /> Refresh data</button></div>{error && <div className="mb-6 rounded-xl border border-[#e2bcae] bg-[#f9e9e4] p-4 text-sm text-[#5b2924]">{error}</div>}{loading ? <div className="flex justify-center p-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : view === 'sessions' ? <SessionsView sessions={visibleSessions} query={query} setQuery={setQuery} active={activeSessions.length} main={mainCount} basement={basementCount} /> : view === 'bags' ? <BagsView rows={bagRows} completed={completedBags} onComplete={updateBag} /> : <AnalyticsView range={range} setRange={setRange} points={chartPoints} hasData={sessions.length > 0} />}</main></div>;
}

function SessionsView({ sessions, query, setQuery, active, main, basement }: { sessions: LibrarySession[]; query: string; setQuery: (value: string) => void; active: number; main: number; basement: number }) {
  const cards: Array<[string, number, LucideIcon]> = [['Active sessions', active, Users], ['Main section', main, BookOpenCheck], ['Basement', basement, LineChart]];
  return <section className="space-y-6"><div className="grid gap-4 md:grid-cols-3">{cards.map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-[#eadbc9] bg-[#fffaf2] p-5 shadow-sm"><Icon className="h-5 w-5 text-primary" /><p className="mt-5 text-3xl font-semibold text-[#3d281f]">{value}</p><p className="mt-1 text-sm text-[#765d4c]">{label}</p></div>)}</div><div className="rounded-2xl border border-[#decfbc] bg-[#fffaf2] shadow-sm"><div className="flex flex-col gap-3 border-b border-[#eee2d2] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-[#3d281f]">Current movement</h2><p className="mt-1 text-sm text-[#765d4c]">Search live records by name, code, zone, or state.</p></div><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9b806d]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sessions" className="rounded-lg border border-[#d8c8b2] bg-[#fffdf8] py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary" /></div></div><div className="divide-y divide-[#eee2d2]">{sessions.length === 0 ? <p className="p-8 text-center text-sm text-[#765d4c]">No matching live sessions.</p> : sessions.map((session) => <div key={session.id} className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] sm:items-center"><div><p className="font-semibold text-[#3d281f]">{session.name}</p><p className="font-mono text-xs text-[#9b806d]">{session.short_code} · ••• {session.student_id.slice(-4)}</p></div><span className="text-[#765d4c]">{session.zone || 'Not assigned'}</span><span className="text-[#765d4c]">{session.status}</span><span className="font-mono text-xs text-[#9b806d]">{minutesLeft(session)} min left</span><span className={`font-semibold ${session.status === 'expired' ? 'text-primary' : 'text-emerald-700'}`}>{session.status === 'expired' ? 'Time ended' : 'Tracked'}</span></div>)}</div></div></section>;
}

function BagsView({ rows, completed, onComplete }: { rows: LibrarySession[]; completed: string[]; onComplete: (session: LibrarySession) => Promise<void> }) {
  return <section className="space-y-6"><div className="rounded-2xl border border-[#e2bcae] bg-[#f9e9e4] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Queue attention</p><h2 className="mt-2 font-display text-2xl font-semibold text-[#5b2924]">{rows.filter((row) => !completed.includes(row.id)).length} bags awaiting verification</h2><p className="mt-2 text-sm text-[#76504a]">Live baggage records from student registrations.</p></div><ClipboardCheck className="h-7 w-7 text-primary" /></div></div><div className="rounded-2xl border border-[#decfbc] bg-[#fffaf2] shadow-sm"><div className="flex items-center justify-between border-b border-[#eee2d2] p-5"><div><h2 className="font-semibold text-[#3d281f]">Open bag claims</h2><p className="mt-1 text-sm text-[#765d4c]">Completing a handoff marks the student session exited.</p></div><Filter className="h-4 w-4 text-[#9b806d]" /></div><div className="divide-y divide-[#eee2d2]">{rows.length === 0 ? <p className="p-8 text-center text-sm text-[#765d4c]">No held bags in the live database.</p> : rows.map((session) => <div key={session.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-[#3d281f]">{session.name} <span className="font-mono text-xs font-normal text-[#9b806d]">••• {session.student_id.slice(-4)}</span></p><p className="mt-1 text-xs text-[#765d4c]">{session.baggage_info} · {session.zone || 'Zone pending'}</p></div>{completed.includes(session.id) || session.status === 'exited' ? <span className="flex items-center gap-1 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" /> Complete</span> : <button type="button" onClick={() => onComplete(session)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">Verify handoff</button>}</div>)}</div></div></section>;
}

function AnalyticsView({ range, setRange, points, hasData }: { range: string; setRange: (value: string) => void; points: number[]; hasData: boolean }) {
  return <section className="space-y-6"><div className="flex flex-wrap gap-2">{['Today', 'This week', 'This month'].map((option) => <button key={option} type="button" onClick={() => setRange(option)} className={`rounded-full px-4 py-2 text-sm font-medium ${range === option ? 'bg-primary text-white' : 'bg-[#fffaf2] text-[#765d4c] ring-1 ring-[#d8c8b2]'}`}>{option}</button>)}</div><div className="grid gap-4 md:grid-cols-3">{[['Unique visits', hasData ? points.reduce((sum, point) => sum + point, 0) : 0, 'from session records'], ['Peak hour', points.length ? `${8 + points.indexOf(Math.max(...points))}:00` : 'No data', 'based on selected range'], ['Data points', points.filter((point) => point > 0).length, hasData ? 'from Supabase' : 'No records yet']].map(([label, value, detail]) => <div key={label as string} className="rounded-2xl border border-[#eadbc9] bg-[#fffaf2] p-5 shadow-sm"><p className="text-sm text-[#765d4c]">{label as string}</p><p className="mt-5 font-display text-3xl font-semibold text-[#3d281f]">{value as string | number}</p><p className="mt-1 text-xs font-semibold text-primary">{detail as string}</p></div>)}</div><div className="rounded-2xl border border-[#decfbc] bg-[#fffaf2] p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-[#3d281f]">Occupancy by hour</h2><p className="mt-1 text-sm text-[#765d4c]">Calculated from Supabase session created_at records for {range.toLowerCase()}.</p></div><button type="button" className="flex items-center gap-2 rounded-lg border border-[#d8c8b2] px-3 py-2 text-sm font-medium text-[#765d4c]"><Download className="h-4 w-4" /> Export</button></div>{hasData ? <><div className="mt-8 flex h-56 items-end gap-2 border-b border-l border-[#d8c8b2] px-3">{points.map((point, index) => <div key={index} className="flex h-full flex-1 items-end"><div className="w-full rounded-t-md bg-primary/80 transition-all" style={{ height: `${Math.max(point, 3)}%` }} /></div>)}</div><div className="mt-3 flex justify-between pl-3 text-xs text-[#9b806d]"><span>8 AM</span><span>10 AM</span><span>12 PM</span><span>2 PM</span><span>4 PM</span><span>6 PM</span></div></> : <p className="mt-10 p-8 text-center text-sm text-[#765d4c]">No session records exist for this range yet. Register student visits to populate the chart.</p>}</div></section>;
}

function minutesLeft(session: LibrarySession) { return Math.max(0, Math.ceil((new Date(session.expires_at).getTime() - Date.now()) / 60000)); }

function buildChart(sessions: LibrarySession[], range: string) {
  const now = Date.now();
  const windowMs = range === 'Today' ? 24 * 60 * 60 * 1000 : range === 'This week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const counts = Array.from({ length: 12 }, () => 0);
  sessions.filter((session) => now - new Date(session.created_at).getTime() <= windowMs).forEach((session) => { const hour = new Date(session.created_at).getHours(); const index = Math.min(11, Math.max(0, hour - 8)); counts[index] += 1; });
  const max = Math.max(...counts, 1);
  return counts.map((count) => Math.round((count / max) * 100));
}
