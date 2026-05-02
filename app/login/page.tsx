import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    invite?: string;
    error?: string;
    mode?: string;
    signup?: string;
    redirect?: string;
  }>;
}) {
  const params = await searchParams;
  const initialMode = params.mode === 'signup' || params.invite ? 'signup' : 'signin';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white">
            R
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Review Network
          </h1>
          <p className="mt-1 text-sm text-slate-500">Operations dashboard</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-6 py-7 shadow-card sm:px-8">
          <LoginForm
            initialMode={initialMode}
            initialInvite={params.invite || ''}
            redirectTo={params.redirect || ''}
            error={params.error}
            signupSuccess={params.signup === 'success'}
          />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Internal access only · Suppliers, use the invite link your contact sent you
        </p>
      </div>
    </div>
  );
}
