'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ClipboardCheck, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { AuthGate } from './AuthGate';
import { useAuth } from '../hooks/useAuth';
import { getBagClaims, verifyBagClaim, type LibrarySession } from '../lib/libraryApi';

export function BagChecksPage() {
  return (
    <AuthGate>
      <BagChecksContent />
    </AuthGate>
  );
}

function BagChecksContent() {
  const { profile, signOut } = useAuth();
  const [bagClaims, setBagClaims] = useState<LibrarySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSessions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      setBagClaims(await getBagClaims());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load bag checks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const pendingClaims = bagClaims.filter((session) => session.status !== 'exited');
  const verifiedClaims = bagClaims.filter((session) => session.status === 'exited');

  async function verifyHandoff(session: LibrarySession) {
    setVerifyingId(session.id);
    setError('');
    setSuccess('');

    try {
      const updated = await verifyBagClaim(session.id);
      setBagClaims((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSuccess(`Bag handoff verified for ${session.name}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to verify this bag handoff.');
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign out.');
    }
  }

  return (
    <div className="min-h-screen bg-[#f3eadb]">
      <header className="border-b border-[#d8c8b2] bg-[#fffaf2]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Libflow
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-[#3d281f]">
              Bag checks
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[#765d4c] sm:inline">
              {profile?.full_name || profile?.email}
            </span>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-2 rounded-lg border border-[#d8c8b2] px-3 py-2 text-sm font-semibold text-[#765d4c] hover:bg-[#f3eadb]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e2bcae] bg-[#f9e9e4] p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="mt-1 h-6 w-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-display text-xl font-semibold text-[#5b2924]">
                {pendingClaims.length} bags awaiting verification
              </h2>
              <p className="mt-1 text-sm text-[#76504a]">
                Review the declared bag details and verify each handoff at the exit.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadSessions(true)}
            disabled={refreshing || loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#d8c8b2] bg-[#fffaf2] px-3 py-2 text-sm font-semibold text-[#765d4c] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </section>

        {error && (
          <div role="alert" className="rounded-xl border border-[#e2bcae] bg-[#fffaf2] p-4 text-sm text-[#9a4638]">
            {error}
          </div>
        )}
        {success && (
          <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {success}
          </p>
        )}

        <section className="overflow-hidden rounded-2xl border border-[#decfbc] bg-[#fffaf2] shadow-sm">
          <div className="border-b border-[#eee2d2] px-5 py-4">
            <h2 className="font-semibold text-[#3d281f]">Bag handoffs</h2>
            <p className="mt-1 text-sm text-[#765d4c]">
              {verifiedClaims.length} verified
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading bag checks" />
            </div>
          ) : bagClaims.length === 0 ? (
            <p className="p-10 text-center text-sm text-[#765d4c]">
              No bag claims are waiting for review.
            </p>
          ) : (
            <ul className="divide-y divide-[#eee2d2]">
              {bagClaims.map((session) => {
                const verified = session.status === 'exited';
                const isVerifying = verifyingId === session.id;
                return (
                  <li
                    key={session.id}
                    className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#3d281f]">
                        {session.name}
                        <span className="ml-2 font-mono text-xs font-normal text-[#9b806d]">
                          ID ••• {session.student_id.slice(-4)}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-[#765d4c]">{session.baggage_info}</p>
                      <p className="mt-1 text-xs text-[#9b806d]">
                        {session.zone || 'Zone pending'} · Code {session.short_code}
                      </p>
                    </div>
                    {verified ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-800">
                        <Check className="h-4 w-4" />
                        Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void verifyHandoff(session)}
                        disabled={isVerifying}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                      >
                        {isVerifying && <Loader2 className="h-4 w-4 animate-spin" />}
                        Verify handoff
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
