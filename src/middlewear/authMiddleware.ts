import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const publicPaths = ['/api/auth/login', '/api/auth/register'];

  if (publicPaths.some(path => req.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if x-user-id header is present — if yes, trust it and skip JWT verification
  const testUserId = req.headers.get('x-user-id');
  if (testUserId) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', testUserId);
    // Optionally, set default email/role for testing
    requestHeaders.set('x-user-email', 'testuser@example.com');
    requestHeaders.set('x-user-role', 'admin');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Else, do normal Bearer token auth
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);

  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', user.id.toString());
  requestHeaders.set('x-user-email', user.email);
  requestHeaders.set('x-user-role', user.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/api/:path*'],
};
