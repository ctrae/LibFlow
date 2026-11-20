'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowUpRight, BookOpenText, Bookmark, CircleHelp, LibraryBig, LogOut, NotebookPen, ScanLine, ShieldCheck } from 'lucide-react';
import { Header } from '@/components/Header';
import { Lander } from '@/components/Lander';
import { StaffSidebar } from '@/components/StaffSidebar';
import { getAdminSessions, LibrarySession } from '@/lib/libraryApi';
import { useAuth } from '@/hooks/useAuth';

type Zone = 'Main section' | 'Basement';
type ScanType = 'Entry' | 'Exit' | 'Zone transition' | 'Bag check';

type ScanEvent = {
  id: string;
  student: string;
  maskedId: string;
  type: ScanType;
  zone: Zone;
  time: string;
  status: 'Verified' | 'Bag held' | 'Needs review';
};

/*
const navItems = [
  { label: 'Overview', path: '/' },
  { label: 'Live sessions', path: '/live-sessions' },
  { label: 'Bag checks', path: '/bag-checks' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Overrides', path: '/overrides' },
];
*/

export default function Index() {
  const [sessions, setSessions] = useState<LibrarySession[]>([]);
  const [activeFilter, setActiveFilter] = useState<'All activity' | ScanType>('All activity');
  const [dataError, setDataError] = useState('');
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const router = useRouter();
  const { profile } = useAuth();
  const displayName = profile?.full_name || 'Staff member';
  const firstName = displayName.trim().split(/\s+/)[0];
  const studentUrl = process.env.NEXT_PUBLIC_STUDENT_URL || 'http://localhost:3000/student';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(studentUrl)}`;
  const activeSessions = sessions.filter((session) => session.status === 'active');
  const mainOccupancy = activeSessions.filter((session) => session.zone === 'Main section').length;
  const basementOccupancy = activeSessions.filter((session) => session.zone === 'Basement').length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const visitsToday = sessions.filter((session) => new Date(session.created_at) >= todayStart).length;
  const bagQueue = sessions.filter((session) => session.baggage_info !== 'No bag declared' && session.status === 'active').length;
  const chartPoints = useMemo(() => buildVisitBars(sessions), [sessions]);
  const zoneOccupancy: Array<[Zone, number, string]> = [
    ['Main section', mainOccupancy, 'bg-primary'],
    ['Basement', basementOccupancy, 'bg-amber-500'],
  ];

  useEffect(() => {
    setCurrentDate(new Date());
    getAdminSessions().then((sessions) => {
      setSessions(sessions);
    }).catch((error: unknown) => {
      setDataError(error instanceof Error ? error.message : 'Unable to load library sessions');
    });
  }, []);

  const events = useMemo(() => sessions.map(toScanEvent), [sessions]);
  const filteredEvents = useMemo(() => activeFilter === 'All activity' ? events : events.filter((event) => event.type === activeFilter), [activeFilter, events]);
  const metrics = [
    ['Active sessions', activeSessions.length, 'Currently active', 'from-[#ead8c1] to-[#f9f1e5]', 'dark:from-[#d8c6b0] dark:to-[#bda68e]', LibraryBig],
    ['Main section', mainOccupancy, 'Active sessions', 'from-[#e8d8cf] to-[#fbf5f0]', 'dark:from-[#dfcbc2] dark:to-[#c5aa99]', BookOpenText],
    ['Basement', basementOccupancy, 'Active sessions', 'from-[#f4dfc2] to-[#fff8ea]', 'dark:from-[#ded2b9] dark:to-[#c5ad87]', NotebookPen],
    ['Visits today', visitsToday, 'Registered today', 'from-[#eadfd3] to-[#fcf7f0]', 'dark:from-[#d8c8b7] dark:to-[#bca58e]', Bookmark],
  ] as const;

  return (
    <div className="library-page min-h-screen bg-[#f3eadb]">
      <Lander />
      <Header />
      <StaffSidebar />
      <main className="mx-auto max-w-[1500px] px-5 py-7 lg:ml-64 lg:px-10">
        <div className="mb-8 flex flex-col gap-6 border-b border-[#d8c8b2] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">{currentDate ? currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Loading date'}</p><h2 className="font-display text-3xl font-semibold tracking-tight text-[#3d281f] md:text-4xl">Welcome, {firstName}.</h2><p className="mt-2 text-sm text-[#765d4c]">Live library activity from registered visits.</p></div>
        </div>

        {dataError && <p role="alert" className="mb-5 rounded-lg bg-[#f9e9e4] p-3 text-sm text-[#9a4638]">{dataError}</p>}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([label, value, detail, color, darkColor, Icon]) => (
            <div
              key={label}
              className={`rounded-2xl border border-[#eadbc9] bg-gradient-to-br ${color} ${darkColor} p-5 shadow-sm dark:border-[#aa927a]`}
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-muted-foreground dark:!text-black">
                  {label}
                </p>
                <Icon className="h-5 w-5 text-[#9a4638]" />
              </div>
              <p className="mt-5 text-3xl font-semibold tracking-tight text-card-foreground dark:!text-black">
                {value}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground dark:!text-black">
                {detail}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" /><h3 className="font-semibold text-slate-950">Recent visit registrations</h3></div><p className="mt-1 text-sm text-slate-500">Visits created during the last 12 hours</p></div></div><div className="mt-6 flex h-48 items-end gap-2 border-b border-l border-slate-200 px-3 pb-0 pt-5">{chartPoints.map((point, index) => <div key={index} className="group flex h-full flex-1 items-end"><div className="w-full rounded-t-md bg-primary/50 transition-all group-hover:bg-primary" style={{ height: `${point}%` }} /></div>)}</div><div className="mt-3 flex justify-between pl-3 text-[11px] text-slate-400"><span>12h ago</span><span>10h</span><span>8h</span><span>6h</span><span>4h</span><span>2h</span><span>Now</span></div></div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold text-slate-950">Recent visit activity</h3><p className="mt-1 text-sm text-slate-500">Registered student sessions</p></div><div className="flex gap-1 overflow-x-auto">{(['All activity', 'Entry', 'Exit', 'Zone transition', 'Bag check'] as const).map((filter) => <button key={filter} type="button" onClick={() => setActiveFilter(filter)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${activeFilter === filter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{filter}</button>)}</div></div><div className="divide-y divide-slate-100">{filteredEvents.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No registered visits yet.</p> : filteredEvents.map((item) => <div key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className={`flex h-9 w-9 items-center justify-center rounded-full ${item.type === 'Exit' ? 'bg-slate-100 text-slate-500' : item.type === 'Bag check' ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`}>{item.type === 'Exit' ? <LogOut className="h-4 w-4" /> : item.type === 'Bag check' ? <ShieldCheck className="h-4 w-4" /> : <ScanLine className="h-4 w-4" />}</div><div><p className="text-sm font-semibold text-slate-900">{item.student} <span className="ml-1 font-mono text-xs font-normal text-slate-400">{item.maskedId}</span></p><p className="mt-0.5 text-xs text-slate-500">{item.type} · {item.zone}</p></div></div><div className="flex items-center gap-4 pl-12 sm:pl-0"><span className={`text-xs font-semibold ${item.status === 'Bag held' ? 'text-amber-600' : 'text-emerald-600'}`}>{item.status}</span><span className="font-mono text-xs text-slate-400">{item.time}</span></div></div>)}</div></div>
          </div>

          <div className="space-y-6"><div className="flex items-center gap-4 rounded-2xl border border-[#decfbc] bg-[#fffaf2] p-4 shadow-sm"><img src={qrUrl} alt="QR code for student library registration" className="h-20 w-20 rounded-lg border border-[#d8c8b2] p-1" /><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Student check-in QR</p><p className="mt-1 text-sm text-[#765d4c]">Place this at the entrance for students to register a visit.</p><a href="/student" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">Open registration page →</a></div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h3 className="font-semibold text-slate-950">Zone occupancy</h3><p className="mt-1 text-sm text-slate-500">Current active sessions by area</p></div><CircleHelp className="h-4 w-4 text-slate-400" /></div><div className="mt-5 space-y-5">{zoneOccupancy.map(([zone, count, color]) => <div key={zone}><div className="flex items-end justify-between"><span className="text-sm font-medium text-slate-700">{zone}</span><span className="font-mono text-sm font-semibold text-slate-950">{count}</span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${color}`} style={{ width: activeSessions.length ? `${count / activeSessions.length * 100}%` : '0%' }} /></div><p className="mt-1 text-right text-xs text-slate-400">{activeSessions.length ? Math.round(count / activeSessions.length * 100) : 0}% of active sessions</p></div>)}</div><button type="button" onClick={() => router.push('/live-sessions')} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><ArrowUpRight className="h-4 w-4" />View live sessions</button></div>
            {bagQueue > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" /><div><h3 className="font-semibold text-amber-950">Bag checks need attention</h3><p className="mt-1 text-sm leading-6 text-amber-800">{bagQueue} active {bagQueue === 1 ? 'visit has' : 'visits have'} baggage claims requiring verification.</p><button type="button" onClick={() => router.push('/bag-checks')} className="mt-3 text-sm font-semibold text-amber-900 underline underline-offset-4">Open bag check queue</button></div></div></div>}
          </div>
        </section>
      </main>
    </div>
  );
}

function toScanEvent(session: LibrarySession): ScanEvent {
  const type: ScanType = session.status === 'exited' ? 'Exit' : session.zone ? 'Zone transition' : 'Entry';
  return {
    id: session.id,
    student: session.name,
    maskedId: `••• ${session.student_id.slice(-4)}`,
    type,
    zone: session.zone || 'Main section',
    time: new Date(session.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }),
    status: session.status === 'expired' ? 'Needs review' : session.baggage_info === 'No bag declared' ? 'Verified' : 'Bag held',
  };
}

function buildVisitBars(sessions: LibrarySession[]) {
  const buckets = Array.from({ length: 12 }, () => 0);
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  for (const session of sessions) {
    const createdAt = new Date(session.created_at).getTime();
    if (createdAt < cutoff) continue;
    const index = Math.min(11, Math.floor((createdAt - cutoff) / (60 * 60 * 1000)));
    buckets[index] += 1;
  }
  const max = Math.max(...buckets, 1);
  return buckets.map((count) => Math.round((count / max) * 100));
}
