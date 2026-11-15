import { supabase } from '@/integrations/supabase/client';

export type PendingLibraryStaff = {
  user_id: string;
  email: string;
  full_name: string | null;
  staff_id: number | null;
  department: string | null;
  assigned_zone: string | null;
  created_at: string;
};

export async function getPendingLibraryStaff() {
  const { data, error } = await supabase.rpc('get_pending_library_staff');
  if (error) throw new Error(error.message);
  return (data ?? []) as PendingLibraryStaff[];
}

export async function approveLibraryStaff(userId: string) {
  const { error } = await supabase.rpc('approve_library_staff', { p_user_id: userId });
  if (error) throw new Error(error.message);
}
