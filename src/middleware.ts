import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge middleware — runs before any API route handler.
 *
 * For protected API groups it verifies the JWT token is PRESENT
 * (full verification still happens in the route handler via getAuthUser,
 *  but this fast-path rejects obviously unauthenticated requests at the edge
 *  before any DB round-trip occurs).
 *
 * Public routes (login, register, forgot-password, reset-password, health,
 * webhook) are skipped entirely.
 */
const PUBLIC_PREFIXES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health',
  '/api/whatsapp',          // webhook — verified by WHATSAPP_VERIFY_TOKEN
  '/api/doctors',           // GET doctors is public (booking widget)
  '/api/bookings/available-slots', // public slot query
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only intercept API routes
  if (!pathname.startsWith('/api/')) return NextResponse.next();

  // Skip public routes
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // For protected routes: reject if no Authorization header at all
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ') || auth.length < 20) {
    return NextResponse.json(
      { message: 'Not authenticated' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
