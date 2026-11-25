'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { getBags, updateSessionStatus, type Bag } from '../../lib/api';

export function BagChecksPage() {
  return (
    <BagChecksContent />
  );
}

export default BagChecksPage;

function BagChecksContent() {
  const [bags, setBags] = useState<Bag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadBags = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      setBags(await getBags());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load bag checks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadBags());
  }, [loadBags]);

  async function verifyHandoff(bag: Bag) {
    setVerifyingId(bag.session_id);
    setError('');
    setSuccess('');

    try {
      await updateSessionStatus(bag.session_id, 'exited');
      setBags((current) => current.filter((item) => item.session_id !== bag.session_id));
      setSuccess(`Bag handoff verified for student ID ending ${bag.student_id.slice(-4)}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to verify this bag handoff.');
    } finally {
      setVerifyingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3eadb]">
      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">

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
          <div className="flex items-center justify-between gap-4 border-b border-[#eee2d2] px-5 py-4">
            <div>
              <h2 className="font-semibold text-[#3d281f]">Bag handoffs</h2>
              <p className="mt-1 text-sm text-[#765d4c]">
                {bags.length} active {bags.length === 1 ? 'bag' : 'bags'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadBags(true)}
              disabled={refreshing || loading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#d8c8b2] bg-[#fffaf2] px-3 py-2 text-sm font-semibold text-[#765d4c] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading bag checks" />
            </div>
          ) : bags.length === 0 ? (
            <p className="p-10 text-center text-sm text-[#765d4c]">
              No active bags are waiting for handoff verification.
            </p>
          ) : (
            <ul className="divide-y divide-[#eee2d2]">
              {bags.map((bag) => {
                const isVerifying = verifyingId === bag.session_id;
                return (
                  <li
                    key={bag.session_id}
                    className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#3d281f]">
                        Bag {bag.bag_number || 'number unavailable'}
                        <span className="ml-2 font-mono text-xs font-normal text-[#9b806d]">
                          ID ••• {bag.student_id.slice(-4)}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void verifyHandoff(bag)}
                      disabled={isVerifying}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                    >
                      {isVerifying && <Loader2 className="h-4 w-4 animate-spin" />}
                      Verify handoff
                    </button>
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