'use client';

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { ApiError, getMe, type StaffRole } from '../lib/api';

/** The signed-in staff member, as confirmed by the backend's staff allowlist. */
export type StaffProfile = {
  user_id: string;
  email: string | null;
  role: StaffRole;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: StaffProfile | null;
  profileError: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Single source of truth for staff sign-in. Every staff page reads this
 * (through AdminShell) instead of running its own session/profile checks.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Id of the user whose profile we hold. Supabase re-announces the same
  // session on every tab focus and token refresh; only a different user (or a
  // sign-out) should clear the profile and re-check staff access.
  const currentUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    function applySession(nextSession: Session | null) {
      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      if (nextUser?.id !== currentUserId.current) {
        currentUserId.current = nextUser?.id ?? null;
        setUser(nextUser);
        setProfile(null);
        setProfileError(null);
        setIsProfileLoading(Boolean(nextUser));
      }
      setIsAuthLoading(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setProfileError(error.message);
      applySession(data.session);
    }).catch((error: unknown) => {
      setProfileError(error instanceof Error ? error.message : 'Unable to load the authentication session');
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;
    void (async () => {
      try {
        // Retry brief outages (503 / network) so one blip doesn't lock staff out.
        let me: Awaited<ReturnType<typeof getMe>> | undefined;
        for (let attempt = 0; ; attempt++) {
          try {
            me = await getMe();
            break;
          } catch (error) {
            const retryable = error instanceof ApiError && (error.status === 0 || error.status >= 500);
            if (!retryable || attempt >= 2 || !active) throw error;
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
        if (!active) return;
        setProfile({ user_id: me.user_id, role: me.role, email: user.email ?? null });
        setProfileError(null);
      } catch (error) {
        if (!active) return;
        setProfile(null);
        setProfileError(
          error instanceof ApiError && error.status === 403
            ? 'This account is not on the staff list.'
            : error instanceof Error ? error.message : 'Unable to load the staff profile',
        );
      } finally {
        if (active) setIsProfileLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      profileError,
      isLoading: isAuthLoading || isProfileLoading,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
