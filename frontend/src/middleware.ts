import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Forward custom request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-url', request.url);

  // Subdomain detection for production multi-domain architecture
  // (launchproduct.com for marketing/discovery vs app.launchproduct.com for SaaS dashboard/founder workspace)
  const isAppSubdomain = hostname.startsWith('app.') || hostname.startsWith('app.localhost');
  if (isAppSubdomain) {
    requestHeaders.set('x-subdomain', 'app');
  }

  // Pass through response with enhanced headers & context
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, brand assets, images
     */
    '/((?!api|_next/static|_next/image|favicon.ico|brand|.*\\..*).*)',
  ],
};
