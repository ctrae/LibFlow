'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '../hooks/use-toast';
import { getCurrentProfile } from '../lib/libraryApi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    let authenticated = false;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      authenticated = true;

      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error('Sign-in did not return an access token.');
      const profile = await getCurrentProfile(accessToken);
      if (profile.user_type === 'Student') {
        throw new Error('No staff profile is linked to this account. Request staff access first.');
      }

      if (!profile.is_approved) {
        toast({ title: 'Approval pending', description: 'Your account needs Head Librarian approval before staff access is enabled.' });
        router.replace('/pending');
      } else {
        toast({ title: 'Welcome back!', description: 'Successfully logged in.' });
        router.replace('/bag-checks');
      }
      authenticated = false;
    } catch (caught) {
      if (authenticated) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          toast({
            title: 'Login could not be verified',
            description: `${caught instanceof Error ? caught.message : 'Unable to verify staff account'} Sign out also failed: ${signOutError.message}`,
            variant: 'destructive',
          });
          return;
        }
      }
      toast({
        title: 'Login failed',
        description: caught instanceof Error ? caught.message : 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="fixed top-4 left-4 z-50">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-secondary-foreground">LibFlow</p>
      </div>
      <div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
        <section className="glass-card flex flex-col justify-center space-y-8 rounded-2xl p-8 sm:p-10">
          <div>
            <h1 className="text-3xl font-bold text-foreground">LibFlow</h1>
            <h1 className="text-xl font-bold text-foreground">Library operations made clearer.</h1>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Sign in to access the staff console and manage library operations with ease. LibFlow provides real-time insights and records of all student library sessions for future reference.
            </p>
          </div>

          <ul className="space-y-4">
            {[
              'See library operations in real time.',
              'Handle student library sessions with ease.',
              'Have records of all student library sessions for future reference.',
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-foreground">
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass-card space-y-6 rounded-2xl p-8 sm:p-10">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold text-foreground">Staff Sign In</h2>
            <p className="text-muted-foreground">Approved library workers can open the staff console.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="h-11" />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : 'Sign in'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            New staff?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">Request an account</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
