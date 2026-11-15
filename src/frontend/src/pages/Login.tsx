'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { BrandLogo } from '@/components/BrandLogo';

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

      const { error: loginRecordError } = await supabase.rpc('record_library_staff_login');
      if (loginRecordError) throw loginRecordError;

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('user_type, is_approved')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile || profile.user_type === 'Student') {
        throw new Error('No staff profile is linked to this account. Request staff access first.');
      }

      if (!profile.is_approved) {
        toast({ title: 'Approval pending', description: 'Your account needs Head Librarian approval before staff access is enabled.' });
        router.replace('/pending');
      } else {
        toast({ title: 'Welcome back!', description: 'Successfully logged in.' });
        router.replace('/');
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
      <div className="w-full max-w-md">
        <div className="glass-card space-y-6 rounded-2xl p-8">
          <div className="space-y-2 text-center">
            <div className="mb-4 flex justify-center">
              <BrandLogo size={112} className="rounded-2xl" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Staff Sign In</h1>
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
          <p className="text-center text-xs text-muted-foreground"><Link href="/student" className="hover:underline">Student visit registration</Link></p>
        </div>
      </div>
    </div>
  );
}
