import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Exact public paths — no auth cookie required
const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/pending', '/schedule']);

// Path prefixes that are always public
const PUBLIC_PREFIXES = ['/results/', '/_next/', '/api/', '/media/', '/admin/'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  // If no access cookie is present, redirect to login before React hydrates.
  // This does not validate the JWT signature — the backend still enforces auth.
  const token = request.cookies.get('access');
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on all paths except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)'],
};
