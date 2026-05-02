'use client';

import { useState } from 'react';
import { login, signup } from './actions';
import { cn } from '@/lib/utils';

export function LoginForm({
  initialMode = 'signin',
  initialInvite = '',
  redirectTo = '',
  error,
  signupSuccess,
}: {
  initialMode?: 'signin' | 'signup';
  initialInvite?: string;
  redirectTo?: string;
  error?: string;
  signupSuccess?: boolean;
}) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  return (
    <div className="w-full">
      {/* Tab switcher */}
      <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition',
            mode === 'signin'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition',
            mode === 'signup'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          Sign up
        </button>
      </div>

      {/* Banners */}
      {signupSuccess && mode === 'signin' && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Account created. If your project requires email confirmation, check your inbox before signing in.
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      {mode === 'signin' ? (
        <form action={login} className="space-y-4">
          {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <Field label="Password" name="password" type="password" required autoComplete="current-password" />
          <SubmitButton>Sign in</SubmitButton>
        </form>
      ) : (
        <form action={signup} className="space-y-4">
          <Field label="Full name" name="full_name" type="text" autoComplete="name" />
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <Field
            label="Password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            hint="At least 8 characters"
          />
          <Field
            label="Invite code"
            name="invite_code"
            type="text"
            defaultValue={initialInvite}
            hint="Required for suppliers. Leave blank if you're an admin/executive."
          />
          <SubmitButton>Create account</SubmitButton>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type,
  required,
  autoComplete,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className="mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
    >
      {children}
    </button>
  );
}
