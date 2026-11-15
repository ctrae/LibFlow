'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function PendingPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');

  async function handleSignOut() {
    try {
      await signOut();
      router.replace('/login');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign out');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">
      <section className="w-full max-w-lg space-y-5 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">Staff account pending</h1>
        <p className="text-muted-foreground">Your request is in the users table and awaits approval by the Head Librarian. Staff tools will unlock after approval.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-center gap-3">
          {user ? (
            <button type="button" onClick={() => void handleSignOut()} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          ) : <Link href="/login" className="rounded-md border px-4 py-2 text-sm font-medium">Return to sign in</Link>}
        </div>
      </section>
    </main>
  );
}
