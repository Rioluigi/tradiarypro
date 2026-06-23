import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  if (user) {
    // 1. Fetch user's profile metadata (role, active status & onboarding plan selection)
    // Skip database fetch on API routes to avoid latency on API calls
    let profile = null;
    if (!isApiRoute) {
      const { data } = await supabase
        .from('profiles')
        .select('role, is_active, onboarding_plan_selected')
        .eq('id', user.id)
        .single();
      profile = data;
    }

    // 2. Block user if inactive (log out & redirect to login with query param)
    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'blocked');
      return NextResponse.redirect(url);
    }

    // Determine onboarding plan selected status (default to true if profile not loaded or column missing)
    const onboardingPlanSelected = profile?.onboarding_plan_selected ?? true;

    // 3. Route Guard for Admin pages
    if (request.nextUrl.pathname.startsWith('/admin')) {
      if (!profile || profile.role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = onboardingPlanSelected ? '/dashboard' : '/onboarding/plan';
        return NextResponse.redirect(url);
      }
    }

    // Auto-mark onboarding complete if coming back from Stripe successful checkout
    const hasOnboardingComplete = request.nextUrl.searchParams.get('onboarding') === 'complete';
    const hasStripeReferrer = request.headers.get('referer')?.includes('stripe.com');

    if (!onboardingPlanSelected && (hasOnboardingComplete || hasStripeReferrer)) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        await supabaseAdmin
          .from('profiles')
          .update({ onboarding_plan_selected: true })
          .eq('id', user.id);

        console.log(`[middleware] Auto-marked onboarding complete for user ${user.id} coming from Stripe.`);

        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        url.searchParams.delete('onboarding');
        return NextResponse.redirect(url);
      } catch (err) {
        console.error('[middleware] Failed to auto-set onboarding complete:', err);
      }
    }

    // 4. Redirect logged-in users to /onboarding/plan if they haven't chosen a plan
    const isExcludedFromOnboardingGate =
      request.nextUrl.pathname.startsWith('/api') ||
      request.nextUrl.pathname.startsWith('/onboarding') ||
      request.nextUrl.pathname.startsWith('/auth') ||
      request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/register') ||
      request.nextUrl.searchParams.has('checkout') ||
      request.nextUrl.searchParams.get('onboarding') === 'complete' ||
      request.nextUrl.pathname.includes('stripe');

    if (!onboardingPlanSelected && !isExcludedFromOnboardingGate) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding/plan';
      return NextResponse.redirect(url);
    }

    // 5. Redirect logged-in users away from /onboarding/plan if they have already chosen a plan
    if (onboardingPlanSelected && request.nextUrl.pathname === '/onboarding/plan') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    // 6. Redirect logged-in users away from auth pages
    if (
      request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/register')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = onboardingPlanSelected ? '/dashboard' : '/onboarding/plan';
      return NextResponse.redirect(url);
    }
  } else {
    // User is not logged in: redirect to login if accessing protected route
    if (
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/register') &&
      !request.nextUrl.pathname.startsWith('/api') &&
      request.nextUrl.pathname !== '/' &&
      !request.nextUrl.pathname.endsWith('.mq5')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mq5)$).*)',
  ],
};
