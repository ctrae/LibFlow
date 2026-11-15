'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Clock3, Copy, Loader2, LogIn, ShieldCheck } from 'lucide-react';
import { getStudentStatus, LibrarySession, registerStudent } from '@/lib/libraryApi';
import { BrandLogo } from '@/components/BrandLogo';

const durationOptions = [15, 30, 45, 60];

export function StudentPortal() {
  const [session, setSession] = useState<LibrarySession | null>(null);
  const [code, setCode] = useState('');
  const [form, setForm] = useState({ name: '', email: '', student_id: '', duration_minutes: 30, baggage_info: 'No bag declared' });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedCode = window.localStorage.getItem('Libflow_student_code');
    if (!savedCode) return;
    setCode(savedCode);
    getStudentStatus(savedCode).then(setSession).catch(() => window.localStorage.removeItem('Libflow_student_code'));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      const result = await registerStudent(form);
      setSession(result);
      setCode(result.short_code);
      window.localStorage.setItem('Libflow_student_code', result.short_code);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to register your visit');
    } finally {
      setIsLoading(false);
    }
  }

  if (session) return <StudentStatus session={session} onRefresh={() => getStudentStatus(session.short_code).then(setSession)} />;

  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-10"><div className="mb-8 flex items-center gap-3"><BrandLogo size={64} className="rounded-xl" /><div><p className="font-display text-2xl font-bold text-[#3d281f]">Libflow</p><p className="text-sm text-[#765d4c]">FST Library student entry</p></div></div><section className="rounded-2xl border border-[#decfbc] bg-[#fffaf2] p-6 shadow-sm md:p-8"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">QR check-in</p><h1 className="mt-3 font-display text-3xl font-bold text-[#3d281f]">Register your library visit</h1><p className="mt-2 text-sm leading-6 text-[#765d4c]">Complete this form after scanning the library QR code. Staff can approve stays longer than one hour.</p><form onSubmit={handleSubmit} className="mt-8 grid gap-5"><label className="grid gap-2 text-sm font-semibold text-[#3d281f]">Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-lg border border-[#d8c8b2] bg-[#fffdf8] px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-primary" placeholder="Your name" /></label><label className="grid gap-2 text-sm font-semibold text-[#3d281f]">@mymona.uwi.edu email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="rounded-lg border border-[#d8c8b2] bg-[#fffdf8] px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-primary" placeholder="name@mymona.uwi.edu" /></label><label className="grid gap-2 text-sm font-semibold text-[#3d281f]">Student ID number<input required value={form.student_id} onChange={(event) => setForm({ ...form, student_id: event.target.value })} className="rounded-lg border border-[#d8c8b2] bg-[#fffdf8] px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-primary" placeholder="Nine-digit ID" /></label><fieldset><legend className="text-sm font-semibold text-[#3d281f]">How long are you staying?</legend><div className="mt-2 grid grid-cols-4 gap-2">{durationOptions.map((minutes) => <button key={minutes} type="button" onClick={() => setForm({ ...form, duration_minutes: minutes })} className={`rounded-lg border px-3 py-3 text-sm font-semibold ${form.duration_minutes === minutes ? 'border-primary bg-primary text-white' : 'border-[#d8c8b2] bg-[#fffdf8] text-[#765d4c]'}`}>{minutes} min</button>)}</div><p className="mt-2 text-xs text-[#9b806d]">Longer stays require approval from library staff.</p></fieldset><label className="grid gap-2 text-sm font-semibold text-[#3d281f]">Baggage information<textarea required value={form.baggage_info} onChange={(event) => setForm({ ...form, baggage_info: event.target.value })} className="min-h-24 rounded-lg border border-[#d8c8b2] bg-[#fffdf8] px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-primary" placeholder="Describe your bag or write No bag declared" /></label>{message && <p className="rounded-lg bg-[#f9e9e4] p-3 text-sm text-[#9a4638]">{message}</p>}<button type="submit" disabled={isLoading} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-white hover:bg-primary/90 disabled:opacity-60">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Register visit</button></form></section></main>;
}

function StudentStatus({ session, onRefresh }: { session: LibrarySession; onRefresh: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);
  const remaining = Math.max(0, Math.ceil((new Date(session.expires_at).getTime() - now) / 60000));
  const copyCode = () => navigator.clipboard?.writeText(session.short_code);
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-10"><div className="mb-8 flex items-center gap-3"><BrandLogo size={64} className="rounded-xl" /><p className="font-display text-2xl font-bold text-[#3d281f]">Libflow Student Pass</p></div><section className="rounded-2xl border border-[#decfbc] bg-[#fffaf2] p-6 shadow-sm md:p-8"><p className="text-sm text-[#765d4c]">Welcome, {session.name}</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-[#ead8c1] p-5"><Clock3 className="h-5 w-5 text-primary" /><p className="mt-4 text-3xl font-bold text-[#3d281f]">{remaining} min</p><p className="mt-1 text-sm text-[#765d4c]">time remaining</p></div><div className="rounded-xl bg-[#f9e9e4] p-5"><ShieldCheck className="h-5 w-5 text-primary" /><p className="mt-4 text-xl font-bold text-[#3d281f]">{session.baggage_info}</p><p className="mt-1 text-sm text-[#765d4c]">baggage status</p></div></div><div className="mt-6 rounded-xl border border-dashed border-primary/50 bg-primary/5 p-6 text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#765d4c]">Your short access code</p><p className="mt-3 font-mono text-4xl font-bold tracking-[0.3em] text-primary">{session.short_code}</p><button type="button" onClick={copyCode} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Copy className="h-4 w-4" /> Copy code</button></div><div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-[#765d4c]"><span>Status: <strong className="text-[#3d281f]">{session.status}{session.zone ? ` · ${session.zone}` : ''}</strong></span><button type="button" onClick={onRefresh} className="rounded-lg border border-[#d8c8b2] px-3 py-2 font-semibold hover:bg-[#ead8c1]">Refresh status</button></div></section></main>;
}
