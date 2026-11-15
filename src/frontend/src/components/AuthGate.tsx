'use client';

import { Loader2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function AuthGate({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, profile, profileError, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [signOutError, setSignOutError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (profileError || !profile) {
    return <AccessMessage
      title="Account profile unavailable"
      description={profileError || 'Your staff profile could not be found. Contact the Head Librarian to have it checked.'}
      onSignOut={signOut}
      error={signOutError}
      setError={setSignOutError}
    />;
  }

  if (profile.user_type === 'Student') {
    return <AccessMessage
      title="Staff access required"
      description="This account is registered as a student, not a library staff."
      onSignOut={signOut}
      error={signOutError}
      setError={setSignOutError}
    />;
  }

  if (!profile.is_approved) {
    return <AccessMessage
      title="Account awaiting approval"
      description="Your staff account has been submitted. You can use staff tools after the Head Librarian approves it."
      onSignOut={signOut}
      error={signOutError}
      setError={setSignOutError}
    />;
  }

  if (requireAdmin && profile.user_type !== 'HeadLibrarian') {
    return <AccessMessage
      title="Administrator access required"
      description="Only the Head Librarian can review and approve staff accounts."
      onSignOut={signOut}
      error={signOutError}
      setError={setSignOutError}
    />;
  }

  return <>{children}</>;
}

function AccessMessage({
  title,
  description,
  onSignOut,
  error,
  setError,
}: {
  title: string;
  description: string;
  onSignOut: () => Promise<void>;
  error: string;
  setError: (message: string) => void;
}) {
  async function handleSignOut() {
    try {
      await onSignOut();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign out');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">
      <section className="w-full max-w-lg space-y-4 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button type="button" onClick={handleSignOut} className="mx-auto inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </section>
    </main>
  );
}
