import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Public routes that don't require authentication.
 * Anything else under /admin or /supplier is protected.
 */
const PUBLIC_PATHS = ['/login', '/auth/confirm', '/auth/callback'];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  // Start with a passthrough response. We'll mutate cookies on this object
  // as Supabase refreshes the session.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          // Reflect new cookies onto the request so downstream handlers see them...
          cookiesToSet.forEach(({ name, value }: CookieToSet) =>
            request.cookies.set(name, value)
          );
          // ...and rebuild the response so the browser receives them too.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // CRITICAL: Do not put any code between createServerClient() and getUser().
  // Doing so risks subtle session-refresh bugs that randomly log users out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publicRoute = isPublic(pathname);

  // 1. Unauthenticated user trying to access a protected route → /login
  if (!user && !publicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Preserve where they were trying to go so we can redirect back after login.
    if (pathname !== '/') {
      url.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(url);
  }

  // 2. Authenticated user — enforce role-based area access.
  if (user && !publicRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role;

    // Admin/exec areas: only admin and executive
    if (pathname.startsWith('/admin') && role !== 'admin' && role !== 'executive') {
      const url = request.nextUrl.clone();
      url.pathname = role === 'main_supplier' ? '/supplier/dashboard' : '/login';
      return NextResponse.redirect(url);
    }

    // Supplier area: only main_supplier
    if (pathname.startsWith('/supplier') && role !== 'main_supplier') {
      const url = request.nextUrl.clone();
      url.pathname = role === 'admin' || role === 'executive' ? '/admin/dashboard' : '/login';
      return NextResponse.redirect(url);
    }

    // Root → role-appropriate dashboard
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname =
        role === 'main_supplier' ? '/supplier/dashboard' : '/admin/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // 3. Authenticated user landing on /login → bounce them to their dashboard
  if (user && pathname === '/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const url = request.nextUrl.clone();
    url.pathname =
      profile?.role === 'main_supplier' ? '/supplier/dashboard' : '/admin/dashboard';
    return NextResponse.redirect(url);
  }

  // CRITICAL: Return supabaseResponse exactly as built. Constructing a new
  // NextResponse without copying cookies will silently break sessions.
  return supabaseResponse;
}
