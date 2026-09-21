'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowUpRight, BookMarked, BookOpenText, Bookmark, Check, CircleHelp, LibraryBig, LogOut, NotebookPen, ScanLine, ShieldCheck } from 'lucide-react';
import { Header } from '@/components/Header';
import { Lander } from '@/components/Lander';
import { getAdminSessions, LibrarySession } from '@/lib/libraryApi';

type Zone = 'Main section' | 'Basement';
type ScanType = 'Entry' | 'Exit' | 'Zone transition' | 'Bag check';

type ScanEvent = {
  id: number;
  student: string;
  maskedId: string;
  type: ScanType;
  zone: Zone;
  time: string;
  status: 'Verified' | 'Bag held' | 'Needs review';
};

const initialEvents: ScanEvent[] = [
  { id: 1, student: 'Amara Lewis', maskedId: '••• 4821', type: 'Entry', zone: 'Main section', time: '10:42:18 AM', status: 'Verified' },
  { id: 2, student: 'Jordan Blake', maskedId: '••• 1934', type: 'Zone transition', zone: 'Basement', time: '10:41:52 AM', status: 'Verified' },
  { id: 3, student: 'Nia Campbell', maskedId: '••• 7702', type: 'Bag check', zone: 'Main section', time: '10:40:07 AM', status: 'Bag held' },
  { id: 4, student: 'Malik Thomas', maskedId: '••• 6248', type: 'Exit', zone: 'Main section', time: '10:38:44 AM', status: 'Verified' },
  { id: 5, student: 'Sofia Grant', maskedId: '••• 9105', type: 'Entry', zone: 'Basement', time: '10:36:21 AM', status: 'Verified' },
];

const chartPoints = [31, 46, 40, 61, 54, 72, 68, 83, 77, 88, 74, 81];
const navItems = [
  { label: 'Overview', path: '/' },
  { label: 'Live sessions', path: '/live-sessions' },
  { label: 'Bag checks', path: '/bag-checks' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Overrides', path: '/overrides' },
];

export default function Index() {
  const [events, setEvents] = useState(initialEvents);
  const [activeFilter, setActiveFilter] = useState<'All activity' | ScanType>('All activity');
  const [studentId, setStudentId] = useState('');
  const [scanMessage, setScanMessage] = useState('Ready for next scan');
  const [bagQueue, setBagQueue] = useState(3);
  const router = useRouter();
  const displayName = 'Staff member';
  const firstName = displayName.trim().split(/\s+/)[0];
  const studentUrl = process.env.NEXT_PUBLIC_STUDENT_URL || 'http://localhost:3000/student';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(studentUrl)}`;

  useEffect(() => {
    getAdminSessions().then((sessions) => {
      if (sessions.length === 0) return;
      setEvents(sessions.map(toScanEvent));
      setBagQueue(sessions.filter((session) => session.baggage_info !== 'No bag declared' && session.status !== 'exited').length);
    }).catch(() => undefined);
  }, []);

  const filteredEvents = useMemo(() => activeFilter === 'All activity' ? events : events.filter((event) => event.type === activeFilter), [activeFilter, events]);

  function handleScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanId = studentId.trim();
    if (!cleanId) {
      setScanMessage('Enter a student ID to verify');
      return;
    }
    const lastFour = cleanId.slice(-4).padStart(4, '0');
    const scan: ScanEvent = { id: Date.now(), student: 'New scan', maskedId: `••• ${lastFour}`, type: 'Entry', zone: 'Main section', time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }), status: 'Verified' };
    setEvents((current) => [scan, ...current]);
    setStudentId('');
    setScanMessage(`Verified ${scan.maskedId} at Main section`);
  }

  return (
    <div className="library-page min-h-screen bg-[#f3eadb]">
      <Lander />
      <Header />
      <main className="mx-auto max-w-[1500px] px-5 py-7 lg:px-10">
        <div className="mb-8 flex flex-col gap-6 border-b border-[#d8c8b2] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Tuesday, 20 September 2026 / 10:43 AM</p><h2 className="font-display text-3xl font-semibold tracking-tight text-[#3d281f] md:text-4xl">Good morning, {firstName}.</h2><p className="mt-2 text-sm text-[#765d4c]">Here is what is happening across the library right now.</p></div>
          <div className="flex gap-2 overflow-x-auto pb-1">{navItems.map((item) => <button key={item.label} type="button" onClick={() => router.push(item.path)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${item.label === 'Overview' ? 'border-primary text-[#3d281f]' : 'border-transparent text-[#765d4c] hover:text-[#3d281f]'}`}>{item.label}</button>)}</div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[['Total inside', '347', '↑ 8.4%', 'from-[#ead8c1] to-[#f9f1e5]', LibraryBig], ['Main section', '284', '82% of capacity', 'from-[#e8d8cf] to-[#fbf5f0]', BookOpenText], ['Basement', '63', '63% of capacity', 'from-[#f4dfc2] to-[#fff8ea]', NotebookPen], ['Unique today', '1,129', 'vs 1,204 scans', 'from-[#eadfd3] to-[#fcf7f0]', Bookmark]].map(([label, value, detail, color, Icon]) => <div key={label as string} className={`rounded-2xl border border-[#eadbc9] bg-gradient-to-br ${color as string} p-5 shadow-sm`}><div className="flex items-start justify-between"><p className="text-sm font-medium text-[#765d4c]">{label as string}</p><Icon className="h-5 w-5 text-[#9a4638]" /></div><p className="mt-5 text-3xl font-semibold tracking-tight text-[#3d281f]">{value as string}</p><p className="mt-1 text-xs font-medium text-[#765d4c]">{detail as string}</p></div>)}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" /><h3 className="font-semibold text-slate-950">Live occupancy</h3></div><p className="mt-1 text-sm text-slate-500">People inside the library over the last 12 hours</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Live · 12 sec ago</span></div><div className="mt-6 flex h-48 items-end gap-2 border-b border-l border-slate-200 px-3 pb-0 pt-5">{chartPoints.map((point, index) => <div key={point + index} className="group flex h-full flex-1 items-end"><div className={`w-full rounded-t-md transition-all group-hover:bg-primary ${index > 8 ? 'bg-primary' : 'bg-primary/25'}`} style={{ height: `${point}%` }} /></div>)}</div><div className="mt-3 flex justify-between pl-3 text-[11px] text-slate-400"><span>8 AM</span><span>10 AM</span><span>12 PM</span><span>2 PM</span><span>4 PM</span><span>6 PM</span></div></div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold text-slate-950">Recent scan activity</h3><p className="mt-1 text-sm text-slate-500">State changes and movement across zones</p></div><div className="flex gap-1 overflow-x-auto">{(['All activity', 'Entry', 'Exit', 'Zone transition', 'Bag check'] as const).map((filter) => <button key={filter} type="button" onClick={() => setActiveFilter(filter)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${activeFilter === filter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{filter}</button>)}</div></div><div className="divide-y divide-slate-100">{filteredEvents.map((item) => <div key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className={`flex h-9 w-9 items-center justify-center rounded-full ${item.type === 'Exit' ? 'bg-slate-100 text-slate-500' : item.type === 'Bag check' ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`}>{item.type === 'Exit' ? <LogOut className="h-4 w-4" /> : item.type === 'Bag check' ? <ShieldCheck className="h-4 w-4" /> : <ScanLine className="h-4 w-4" />}</div><div><p className="text-sm font-semibold text-slate-900">{item.student} <span className="ml-1 font-mono text-xs font-normal text-slate-400">{item.maskedId}</span></p><p className="mt-0.5 text-xs text-slate-500">{item.type} · {item.zone}</p></div></div><div className="flex items-center gap-4 pl-12 sm:pl-0"><span className={`text-xs font-semibold ${item.status === 'Bag held' ? 'text-amber-600' : 'text-emerald-600'}`}>{item.status}</span><span className="font-mono text-xs text-slate-400">{item.time}</span></div></div>)}</div></div>
          </div>

          <div className="space-y-6"><div className="flex items-center gap-4 rounded-2xl border border-[#decfbc] bg-[#fffaf2] p-4 shadow-sm"><img src={qrUrl} alt="QR code for student library registration" className="h-20 w-20 rounded-lg border border-[#d8c8b2] p-1" /><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Student check-in QR</p><p className="mt-1 text-sm text-[#765d4c]">Place this at the entrance for students to register a visit.</p><a href="/student" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">Open registration page →</a></div></div><form onSubmit={handleScan} className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/60">Edge device simulator</p><h3 className="mt-2 text-xl font-semibold">Quick scan</h3><p className="mt-1 text-sm text-slate-400">Test the entry workflow before hardware deployment.</p></div><NotebookPen className="h-5 w-5 text-primary" /></div><label className="mt-6 block text-xs font-medium text-slate-400" htmlFor="student-id">Student ID</label><div className="mt-2 flex gap-2"><input id="student-id" value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="Scan or enter ID" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none ring-primary placeholder:text-slate-600 focus:ring-2" /><button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">Verify</button></div><p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><Check className="h-3.5 w-3.5 text-primary" />{scanMessage}</p></form>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h3 className="font-semibold text-slate-950">Zone occupancy</h3><p className="mt-1 text-sm text-slate-500">Current capacity by area</p></div><CircleHelp className="h-4 w-4 text-slate-400" /></div><div className="mt-5 space-y-5">{[['Main section', 284, 82, 'bg-primary'], ['Basement', 63, 63, 'bg-amber-500']].map(([zone, count, percent, color]) => <div key={zone as string}><div className="flex items-end justify-between"><span className="text-sm font-medium text-slate-700">{zone as string}</span><span className="font-mono text-sm font-semibold text-slate-950">{count as number} <span className="text-xs font-normal text-slate-400">/ {zone === 'Main section' ? 350 : 100}</span></span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${color as string}`} style={{ width: `${percent}%` }} /></div><p className="mt-1 text-right text-xs text-slate-400">{percent as number}% occupied</p></div>)}</div><button type="button" className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><ArrowUpRight className="h-4 w-4" />View zone map</button></div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" /><div><h3 className="font-semibold text-amber-950">Bag checks need attention</h3><p className="mt-1 text-sm leading-6 text-amber-800">{bagQueue} bags are waiting for verification at the main exit.</p><button type="button" onClick={() => setBagQueue(0)} className="mt-3 text-sm font-semibold text-amber-900 underline underline-offset-4">Open bag check queue</button></div></div></div>
          </div>
        </section>
      </main>
    </div>
  );
}

function toScanEvent(session: LibrarySession): ScanEvent {
  const type: ScanType = session.status === 'exited' ? 'Exit' : session.zone ? 'Zone transition' : 'Entry';
  return {
    id: new Date(session.created_at).getTime(),
    student: session.name,
    maskedId: `••• ${session.student_id.slice(-4)}`,
    type,
    zone: session.zone || 'Main section',
    time: new Date(session.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }),
    status: session.status === 'expired' ? 'Needs review' : session.baggage_info === 'No bag declared' ? 'Verified' : 'Bag held',
  };
}
