'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Signup() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    staffId: '',
    department: '',
    assignedZone: 'Main Section',
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const email = form.email.trim().toLowerCase();
      if (!email.endsWith('@mymona.uwi.edu')) throw new Error('Use your @mymona.uwi.edu work email address.');
      if (!/^\d{1,9}$/.test(form.staffId.trim())) throw new Error('Enter a staff ID containing up to 9 digits.');

      const { data, error } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: form.fullName.trim(),
            staff_id: form.staffId.trim(),
            department: form.department.trim(),
            assigned_zone: form.assignedZone,
          },
        },
      });
      if (error) throw error;

      if (data.session) {
        toast({ title: 'Request submitted', description: 'Sign in after the Head Librarian approves your staff account.' });
        router.replace('/pending');
      } else {
        toast({ title: 'Confirm your email', description: 'Check your inbox, then sign in. Your staff account will need admin approval.' });
        router.replace('/login');
      }
    } catch (caught) {
      toast({
        title: 'Request failed',
        description: caught instanceof Error ? caught.message : 'Could not create the staff account',
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
      <div className="w-full max-w-md">
        <div className="space-y-6 rounded-2xl p-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-foreground">Request staff access</h1>
            <p className="text-muted-foreground">Staff accounts remain pending until approved by the Head Librarian.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full name</Label>
              <Input id="full-name" autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-id">Staff ID</Label>
              <Input id="staff-id" inputMode="numeric" value={form.staffId} onChange={(event) => setForm({ ...form, staffId: event.target.value })} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <select id="department" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="Security">Security</option>
                <option value="Bag Staff">Bag Staff</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned-zone">Assigned zone</Label>
              <select id="assigned-zone" value={form.assignedZone} onChange={(event) => setForm({ ...form, assignedZone: event.target.value })} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="Main Section">Main Section</option>
                <option value="Basement">Basement</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required className="h-11" />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : 'Submit for approval'}
            </Button>   
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Already registered?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
