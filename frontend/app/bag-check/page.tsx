'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ClipboardCheck, Loader2, RefreshCw } from 'lucide-react';
import { getBags, updateBag, type Bag } from '../../lib/api';
import AdminShell from '../shared/components/AdminShell';
import { BAG_DESK_KEY } from '../shared/adminNav';

export function BagChecksPage() {
  return (
    <AdminShell currentTab={BAG_DESK_KEY}>
      <BagChecksContent />
    </AdminShell>
  );
}

export default BagChecksPage;

function BagChecksContent() {
  // Active sessions that have a bag number. Verifying a handoff releases
  // the bag (bag_number -> null) and moves it to `verified`.
  const [bagClaims, setBagClaims] = useState<Bag[]>([]);
  const [verifiedClaims, setVerifiedClaims] = useState<Bag[]>([]);
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
      setBagClaims(await getBags());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load bag checks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadSessions());
  }, [loadSessions]);

  const pendingClaims = bagClaims;

  async function verifyHandoff(bag: Bag) {
    setVerifyingId(bag.session_id);
    setError('');
    setSuccess('');

    try {
      await updateBag(bag.session_id, null);
      setBagClaims((current) => current.filter((item) => item.session_id !== bag.session_id));
      setVerifiedClaims((current) => [bag, ...current]);
      setSuccess(`Bag ${bag.bag_number} handed back to student ••• ${bag.student_id.slice(-4)}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to verify this bag handoff.');
    } finally {
      setVerifyingId(null);
    }
  }

  return (
    <div>
      <main className="mx-auto max-w-5xl space-y-6">
        <h1 className="font-display text-[32px] font-bold leading-tight text-[#3d281f]">
          Exit bag desk
        </h1>
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
          ) : bagClaims.length + verifiedClaims.length === 0 ? (
            <p className="p-10 text-center text-sm text-[#765d4c]">
              No bag claims are waiting for review.
            </p>
          ) : (
            <ul className="divide-y divide-[#eee2d2]">
              {[...bagClaims, ...verifiedClaims].map((session) => {
                const verified = verifiedClaims.includes(session);
                const isVerifying = verifyingId === session.session_id;
                return (
                  <li
                    key={session.session_id}
                    className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#3d281f]">
                        Bag {session.bag_number}
                        <span className="ml-2 font-mono text-xs font-normal text-[#9b806d]">
                          ID ••• {session.student_id.slice(-4)}
                        </span>
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