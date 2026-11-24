'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { getCurrentProfile, type LibraryUserProfile } from '../lib/libraryApi';
export type { LibraryUserProfile } from '../lib/libraryApi';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: LibraryUserProfile | null;
  profileError: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<LibraryUserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setProfile(null);
      setProfileError(null);
      setIsProfileLoading(Boolean(nextSession));
      setIsAuthLoading(false);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setProfileError(error.message);
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsProfileLoading(Boolean(data.session));
      setIsAuthLoading(false);
    }).catch((error: unknown) => {
      setProfileError(error instanceof Error ? error.message : 'Unable to load the authentication session');
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !session?.access_token) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }

    let active = true;
    setIsProfileLoading(true);
    void (async () => {
      try {
        const nextProfile = await getCurrentProfile(session.access_token);
        if (!active) return;
        setProfile(nextProfile);
        setProfileError(null);
        setIsProfileLoading(false);
      } catch (error) {
        if (!active) return;
        setProfileError(error instanceof Error ? error.message : 'Unable to load the staff profile');
        setIsProfileLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [session?.access_token, user]);

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
