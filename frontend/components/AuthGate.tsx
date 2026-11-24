'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, profile, profileError, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
    if (!isLoading && user && profile && !profile.is_approved) router.replace('/pending');
  }, [isLoading, profile, router, user]);

  if (isLoading || (user && !profile && !profileError)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3eadb]">
        <Loader2 className="h-7 w-7 animate-spin text-primary" aria-label="Checking staff access" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3eadb] p-6">
        <p className="text-sm text-[#765d4c]">Redirecting to staff sign in…</p>
      </main>
    );
  }

  if (
    profileError ||
    !profile ||
    (profile.user_type !== 'Head Librarian' && profile.user_type !== 'Library Staff')
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3eadb] p-6">
        <section className="max-w-md rounded-xl border border-[#e2bcae] bg-[#fffaf2] p-6 text-center">
          <h1 className="font-semibold text-[#3d281f]">Staff access unavailable</h1>
          <p role="alert" className="mt-2 text-sm text-[#765d4c]">
            {profileError || 'A staff profile is required to manage bag checks.'}
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-primary">
            Return to staff sign in
          </Link>
        </section>
      </main>
    );
  }

  if (!profile.is_approved) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3eadb] p-6">
        <p className="text-sm text-[#765d4c]">Redirecting to the staff approval page…</p>
      </main>
    );
  }

  return children;
}
