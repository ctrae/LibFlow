'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, BellRing, Check, CheckCircle2, Loader2, MapPin, RefreshCw, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAdminSessions, LibrarySession, LibraryZone, resolveSessionExtension, SessionStatus, updateAdminStatus } from '@/lib/libraryApi';
import { AuthGate } from '@/components/AuthGate';
import { Header } from '@/components/Header';
import { StaffSidebar } from '@/components/StaffSidebar';

export function OverrideDashboard() {
  return <AuthGate><OverrideDashboardContent /></AuthGate>;
}

function OverrideDashboardContent() {
  const router = useRouter();
  const [sessions, setSessions] = useState<LibrarySession[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  async function loadSessions() {
    setLoading(true);
    try { setSessions(await getAdminSessions()); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load sessions'); } finally { setLoading(false); }
  }

  useEffect(() => {
    loadSessions();
    const interval = window.setInterval(loadSessions, 30000);
    return () => window.clearInterval(interval);
  }, []);

  async function update(id: string, zone: LibraryZone, status: SessionStatus) {
    try { const updated = await updateAdminStatus(id, zone, status); setSessions((current) => current.map((session) => session.id === updated.id ? updated : session)); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update status'); }
  }

  async function resolveExtension(id: string, approve: boolean) {
    setResolving(id);
    setMessage('');
    try {
      const updated = await resolveSessionExtension(id, approve);
      setSessions((current) => current.map((session) => session.id === updated.id ? updated : session));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to resolve extension request');
    } finally {
      setResolving(null);
    }
  }

  const expired = sessions.filter((session) => session.status === 'expired');
  return (
    <div className="library-page min-h-screen bg-[#f3eadb]">
      <Header />
      <StaffSidebar />
      <main className="mx-auto max-w-[1280px] px-5 py-8 lg:ml-64 lg:px-10">
        <button type="button" onClick={() => router.push('/')} className="mb-7 flex items-center gap-2 text-sm font-semibold text-[#765d4c] hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to overview</button>
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[#d8c8b2] pb-6 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Libflow / Security desk</p><h1 className="mt-2 font-display text-3xl font-bold text-[#3d281f]">Status overrides</h1><p className="mt-2 text-sm text-[#765d4c]">Update entry, exit, and zone status for registered students.</p></div><button type="button" onClick={loadSessions} className="inline-flex items-center gap-2 rounded-lg border border-[#d8c8b2] bg-[#fffaf2] px-3 py-2 text-sm font-semibold text-[#765d4c] hover:bg-[#ead8c1]"><RefreshCw className="h-4 w-4" /> Refresh</button></div>
        {expired.length > 0 && <div className="mb-6 flex gap-3 rounded-xl border border-[#e2bcae] bg-[#f9e9e4] p-4 text-[#5b2924]"><BellRing className="h-5 w-5 shrink-0 text-primary" /><p className="text-sm"><strong>{expired.length} student{expired.length === 1 ? '' : 's'}</strong> have reached their time limit and need attention. Their current zone is shown below.</p></div>}
        {message && <p className="mb-6 rounded-lg bg-[#f9e9e4] p-3 text-sm text-primary">{message}</p>}
        {loading ? (
          <div className="flex justify-center p-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-[#decfbc] bg-[#fffaf2] shadow-sm">
            <div className="grid gap-3 border-b border-[#eee2d2] bg-[#ead8c1] px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#765d4c] md:grid-cols-[1.2fr_0.8fr_0.8fr_1.3fr_1.7fr]">
              <span>Student</span>
              <span>Zone</span>
              <span>State</span>
              <span>Override</span>
              <span>Extension request</span>
            </div>
            {sessions.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#765d4c]">No student registrations yet.</p>
            ) : sessions.map((session) => (
              <div
                key={session.id}
                className="grid gap-4 border-b border-[#eee2d2] px-5 py-5 last:border-b-0 md:grid-cols-[1.2fr_0.8fr_0.8fr_1.3fr_1.7fr] md:items-center"
              >
                <div>
                  <p className="font-semibold text-[#3d281f]">{session.name}</p>
                  <p className="font-mono text-xs text-[#9b806d]">{session.short_code} · {session.student_id}</p>
                </div>
                <span className="flex items-center gap-1 text-sm text-[#765d4c]">
                  <MapPin className="h-4 w-4 text-primary" />{session.zone || 'Not assigned'}
                </span>
                <span className={`inline-flex w-fit items-center gap-1 text-sm font-semibold ${session.status === 'expired' ? 'text-primary' : session.status === 'exited' ? 'text-[#765d4c]' : 'text-emerald-700'}`}>
                  {session.status === 'expired' ? <BellRing className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {session.status}
                </span>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={session.zone || 'Main section'}
                    onChange={(event) => update(session.id, event.target.value as LibraryZone, session.status)}
                    className="rounded-md border border-[#d8c8b2] bg-[#fffdf8] px-2 py-2 text-xs"
                  >
                    <option>Main section</option>
                    <option>Basement</option>
                  </select>
                  <select
                    value={session.status}
                    onChange={(event) => update(session.id, session.zone || 'Main section', event.target.value as SessionStatus)}
                    className="rounded-md border border-[#d8c8b2] bg-[#fffdf8] px-2 py-2 text-xs"
                  >
                    <option value="active">Active</option>
                    <option value="exited">Exited</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2 text-sm text-[#765d4c]">
                  {session.extension_request_status ? (
                    <>
                      <span>
                        {session.extension_requested_minutes} min · {session.extension_request_status}
                      </span>
                      {session.extension_request_status === 'pending' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => resolveExtension(session.id, true)}
                            disabled={resolving === session.id}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                          >
                            {resolving === session.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => resolveExtension(session.id, false)}
                            disabled={resolving === session.id}
                            className="inline-flex items-center gap-1 rounded-md border border-[#d8c8b2] px-2 py-1.5 text-xs font-semibold hover:bg-[#ead8c1] disabled:opacity-60"
                          >
                            <X className="h-3 w-3" />
                            Deny
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <span>No request</span>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
