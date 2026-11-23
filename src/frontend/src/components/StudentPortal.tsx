'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Clock3, Copy, Loader2, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { checkoutStudent, getStudentStatus, LibrarySession, LibraryZone, registerStudent, requestSessionExtension } from '@/lib/libraryApi';

const durationOptions = [15, 30, 45, 60];

export function StudentPortal() {
  const [session, setSession] = useState<LibrarySession | null>(null);
  const [code, setCode] = useState('');
  const [zone, setZone] = useState<LibraryZone | ''>('');
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
    if (!zone) {
      setMessage('Choose your current library zone');
      return;
    }
    setIsLoading(true);
    setMessage('');
    try {
      const result = await registerStudent({ ...form, zone });
      setSession(result);
      setCode(result.short_code);
      window.localStorage.setItem('Libflow_student_code', result.short_code);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to register your visit');
    } finally {
      setIsLoading(false);
    }
  }

  if (session) {
    return (
      <StudentStatus
        session={session}
        onSessionChange={setSession}
        onRefresh={() => getStudentStatus(session.short_code).then(setSession)}
      />
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10">
      <div className="fixed top-4 left-4 z-50">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-secondary-foreground">LibFlow</p>
      </div>
      <div className="mb-8 flex items-center gap-3">
        <div>
          <p className="text-sm text-[#765d4c]">FST Library student entry</p>
        </div>
      </div>
      <section className="rounded-2xl border border-[#decfbc] bg-[#fffaf2] p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          QR check-in
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold text-[#3d281f]">
          Register your library visit
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#765d4c]">
          Complete this form after scanning the library QR code. Staff can approve stays longer than one hour.
        </p>
      <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
        <label className="grid gap-2 text-sm font-semibold text-[#3d281f]">
          Full name
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-lg border border-[#d8c8b2] bg-[#fffdf8] px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-primary" placeholder="Your name" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#3d281f]">
          @mymona.uwi.edu email
          <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="rounded-lg border border-[#d8c8b2] bg-[#fffdf8] px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-primary" placeholder="name@mymona.uwi.edu" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#3d281f]">
          Student ID number
          <input required value={form.student_id} onChange={(event) => setForm({ ...form, student_id: event.target.value })} className="rounded-lg border border-[#d8c8b2] bg-[#fffdf8] px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-primary" placeholder="Nine-digit ID" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#3d281f]">
          Current library zone
          <select
            required
            value={zone}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'Main section' || value === 'Basement') {
                setZone(value);
              } else {
                setZone('');
              }
            }}
            className="rounded-lg border border-[#d8c8b2] bg-[#fffdf8] px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>Choose your zone</option>
            <option value="Main section">Main section</option>
            <option value="Basement">Basement</option>
          </select>
        </label>
        <fieldset>
          <legend className="text-sm font-semibold text-[#3d281f]">How long are you staying?</legend>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {durationOptions.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setForm({ ...form, duration_minutes: minutes })}
                className={`rounded-lg border px-3 py-3 text-sm font-semibold ${form.duration_minutes === minutes ? 'border-primary bg-primary text-white' : 'border-[#d8c8b2] bg-[#fffdf8] text-[#765d4c]'}`}
              >
                {minutes} min
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[#9b806d]">Longer stays require approval from library staff.</p>
        </fieldset>
        <label className="grid gap-2 text-sm font-semibold text-[#3d281f]">
          Baggage information
          <textarea
            required
            value={form.baggage_info}
            onChange={(event) => setForm({ ...form, baggage_info: event.target.value })}
            className="min-h-24 rounded-lg border border-[#d8c8b2] bg-[#fffdf8] px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-primary"
            placeholder="Describe your bag or write No bag declared"
          />
        </label>
        {message && (
          <p className="rounded-lg bg-[#f9e9e4] p-3 text-sm text-[#9a4638]">{message}</p>
        )}
        <button type="submit" disabled={isLoading} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-white hover:bg-primary/90 disabled:opacity-60">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Register visit</button>
      </form>
      </section>
    </main>
  );
}

function StudentStatus({
  session,
  onSessionChange,
  onRefresh,
}: {
  session: LibrarySession;
  onSessionChange: (session: LibrarySession) => void;
  onRefresh: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [requestedMinutes, setRequestedMinutes] = useState(15);
  const [isWorking, setIsWorking] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);
  const remaining = Math.max(0, Math.ceil((new Date(session.expires_at).getTime() - now) / 60000));
  const displayStatus = session.status === 'exited'
    ? 'exited'
    : remaining === 0
      ? 'expired'
      : session.status;
  const copyCode = () => navigator.clipboard?.writeText(session.short_code);

  async function handleCheckout() {
    setIsWorking(true);
    setActionMessage('');
    setActionError('');
    try {
      const updated = await checkoutStudent(session.short_code);
      onSessionChange(updated);
      window.localStorage.removeItem('Libflow_student_code');
      setActionMessage('You have checked out.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to check out');
    } finally {
      setIsWorking(false);
    }
  }

  async function handleExtensionRequest() {
    setIsWorking(true);
    setActionMessage('');
    setActionError('');
    try {
      const updated = await requestSessionExtension(session.short_code, requestedMinutes);
      onSessionChange(updated);
      setActionMessage(`Your request for ${requestedMinutes} additional minutes was sent to library staff.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to request additional time');
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10">
      <div className="fixed top-4 left-4 z-50">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-secondary-foreground">LibFlow</p>
      </div>

      <section className="rounded-2xl border border-[#decfbc] bg-[#fffaf2] p-6 shadow-sm md:p-8">
        <p className="text-sm text-[#765d4c]">Welcome, {session.name}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-[#ead8c1] p-5">
            <Clock3 className="h-5 w-5 text-primary" />
            <p className="mt-4 text-3xl font-bold text-[#3d281f]">{remaining} min</p>
            <p className="mt-1 text-sm text-[#765d4c]">time remaining</p>
          </div>
          <div className="rounded-xl bg-[#f9e9e4] p-5">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <p className="mt-4 text-xl font-bold text-[#3d281f]">
              {session.baggage_info}
            </p>
            <p className="mt-1 text-sm text-[#765d4c]">baggage status</p>
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-dashed border-primary/50 bg-primary/5 p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#765d4c]">
            Your short access code
          </p>
          <p className="mt-3 font-mono text-4xl font-bold tracking-[0.3em] text-primary">
            {session.short_code}
          </p>
          <button
            type="button"
            onClick={copyCode}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <Copy className="h-4 w-4" />
            Copy code
          </button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-[#765d4c]">
          <span>
            Status:{' '}
            <strong className="text-[#3d281f]">
              {displayStatus}
            </strong>
            <span> · Current zone: <strong className="text-[#3d281f]">{session.zone || 'Not assigned'}</strong></span>
          </span>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-[#d8c8b2] px-3 py-2 font-semibold hover:bg-[#ead8c1]"
          >
            Refresh status
          </button>
        </div>
      </section>
      {session.status !== 'exited' && (
        <section className="mt-4 rounded-2xl border border-[#decfbc] bg-[#fffaf2] p-5 shadow-sm">
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-[#3d281f]">
              Additional minutes requested
              <input
                type="number"
                min={1}
                max={60}
                step={1}
                value={requestedMinutes}
                onChange={(event) => setRequestedMinutes(Number(event.target.value))}
                disabled={isWorking || session.extension_request_status === 'pending'}
                className="w-full rounded-lg border border-[#d8c8b2] bg-[#fffdf8] px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isWorking}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d8c8b2] px-4 py-3 font-semibold text-[#765d4c] hover:bg-[#ead8c1] disabled:opacity-60"
              >
                {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Check out
              </button>
              <button
                type="button"
                onClick={handleExtensionRequest}
                disabled={isWorking || session.extension_request_status === 'pending' || !Number.isInteger(requestedMinutes) || requestedMinutes < 1 || requestedMinutes > 60}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
              >
                {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}
                {session.extension_request_status === 'pending' ? 'Request pending' : 'Request override'}
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-[#765d4c]">
            Requests for 1–60 additional minutes require staff approval and can be made after your time expires.
          </p>
          {session.extension_request_status && (
            <p className="mt-3 text-sm font-medium text-[#765d4c]">
              Latest request: {session.extension_requested_minutes} additional minutes — {session.extension_request_status}.
            </p>
          )}
          {actionMessage && <p className="mt-3 text-sm font-medium text-emerald-700">{actionMessage}</p>}
          {actionError && <p className="mt-3 rounded-lg bg-[#f9e9e4] p-3 text-sm text-[#9a4638]">{actionError}</p>}
        </section>
      )}
    </main>
  );
}
