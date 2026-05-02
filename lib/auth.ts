import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Role = 'admin' | 'executive' | 'main_supplier';

export type CurrentUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  main_supplier_id: string | null;
};

/**
 * Loads the current authenticated user along with their profile row.
 * Redirects to /login if not authenticated.
 * Use in all protected Server Components.
 */
export async function requireUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, main_supplier_id')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) {
    // Profile missing - signup trigger may have failed. Sign out and bounce.
    await supabase.auth.signOut();
    redirect('/login?error=profile_missing');
  }

  return profile as CurrentUser;
}

export async function requireAdminOrExec(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== 'admin' && user.role !== 'executive') {
    redirect(user.role === 'main_supplier' ? '/supplier/dashboard' : '/login');
  }
  return user;
}

export async function requireSupplier(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== 'main_supplier') {
    redirect('/admin/dashboard');
  }
  return user;
}
