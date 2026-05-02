'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const redirectTo = String(formData.get('redirect') || '');

  if (!email || !password) {
    redirect('/login?error=' + encodeURIComponent('Email and password required'));
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/', 'layout');

  // After login, get the user's role to send them to the right place.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    // If the user came from a specific URL, send them back there
    // (assuming their role allows access — middleware will catch any mismatch).
    if (redirectTo && redirectTo.startsWith('/')) {
      redirect(redirectTo);
    }

    if (profile?.role === 'main_supplier') {
      redirect('/supplier/dashboard');
    }
  }

  redirect('/admin/dashboard');
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const fullName = String(formData.get('full_name') || '').trim();
  const inviteCode = String(formData.get('invite_code') || '').trim();

  if (!email || !password) {
    redirect('/login?error=' + encodeURIComponent('Email and password required') + '&mode=signup');
  }

  if (password.length < 8) {
    redirect('/login?error=' + encodeURIComponent('Password must be at least 8 characters') + '&mode=signup');
  }

  // Pass invite_code in user_metadata; the handle_new_user trigger reads it
  // and auto-links the new profile to the matching main_supplier.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || null,
        invite_code: inviteCode || null,
      },
    },
  });

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message) + '&mode=signup');
  }

  // Whether email confirmation is required depends on Supabase project settings.
  // Either way, send them to a friendly "check your email" state on /login.
  redirect('/login?signup=success');
}
