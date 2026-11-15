'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/components/AuthGate';
import { PendingLibraryStaff, approveLibraryStaff, getPendingLibraryStaff } from '@/lib/staffUsersApi';

export function StaffApprovalPage() {
  return <AuthGate requireAdmin><StaffApprovalContent /></AuthGate>;
}

function StaffApprovalContent() {
  const router = useRouter();
  const [staff, setStaff] = useState<PendingLibraryStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setStaff(await getPendingLibraryStaff());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load pending staff accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  async function approve(userId: string) {
    setApproving(userId);
    setError('');
    setMessage('');
    try {
      await approveLibraryStaff(userId);
      setStaff((current) => current.filter((entry) => entry.user_id !== userId));
      setMessage('Staff account approved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to approve staff account');
    } finally {
      setApproving(null);
    }
  }

  return (
    <main className="library-page min-h-screen bg-[#f3eadb]">
      <section className="mx-auto max-w-5xl px-5 py-8 lg:px-10">
        <button type="button" onClick={() => router.push('/')} className="mb-7 flex items-center gap-2 text-sm font-semibold text-[#765d4c] hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to overview
        </button>
        <div className="mb-8 flex items-end justify-between gap-4 border-b border-[#d8c8b2] pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Libflow / Administration</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-[#3d281f]">Staff approvals</h1>
            <p className="mt-2 text-sm text-[#765d4c]">Review staff details before granting access to library operations.</p>
          </div>
          <button type="button" onClick={() => void loadStaff()} className="inline-flex items-center gap-2 rounded-lg border border-[#d8c8b2] bg-[#fffaf2] px-3 py-2 text-sm font-semibold text-[#765d4c]">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
        {error && <p role="alert" className="mb-5 rounded-lg bg-[#f9e9e4] p-3 text-sm text-[#9a4638]">{error}</p>}
        {message && <p role="status" className="mb-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        {loading ? (
          <div className="flex justify-center p-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : staff.length === 0 ? (
          <div className="rounded-2xl border border-[#decfbc] bg-[#fffaf2] p-10 text-center text-sm text-[#765d4c]">There are no staff accounts waiting for approval.</div>
        ) : (
          <div className="space-y-4">
            {staff.map((entry) => (
              <article key={entry.user_id} className="flex flex-col justify-between gap-5 rounded-2xl border border-[#decfbc] bg-[#fffaf2] p-5 shadow-sm sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-semibold text-[#3d281f]">{entry.full_name || 'Name not provided'}</h2>
                  <p className="mt-1 text-sm text-[#765d4c]">{entry.email}</p>
                  <p className="mt-2 text-xs text-[#9b806d]">
                    Staff ID: {entry.staff_id ?? 'Not provided'} · {entry.department || 'Department not provided'} · {entry.assigned_zone || 'Zone not provided'}
                  </p>
                </div>
                <button type="button" disabled={approving === entry.user_id} onClick={() => void approve(entry.user_id)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {approving === entry.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Approve staff
                </button>
              </article>
            ))}
          </div>
        )}
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-[#decfbc] bg-[#fffaf2] p-4 text-sm text-[#765d4c]">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          Approval grants staff access only; public signups cannot create Head Librarian accounts.
        </div>
      </section>
    </main>
  );
}
