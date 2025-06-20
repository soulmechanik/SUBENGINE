import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/subscribe', '/subscribe/success'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  console.log('🛡️ Middleware triggered for:', pathname);

  // Check if the request is for a public route
  if (PUBLIC_ROUTES.includes(pathname)) {
    console.log(`🌐 Public route matched (${pathname}) → Allowing access`);
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;
  console.log('🍪 Cookie token found:', token ? '[YES]' : '[NO]');

  if (!token) {
    console.warn(`🚫 No token in cookies → Redirecting to /login`);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    console.log('🔐 Verifying token with JWT_SECRET');

    const verified = await jwtVerify(token, secret);
    console.log('✅ Token verified:', verified?.payload);

    return NextResponse.next();
  } catch (err) {
    console.error('❌ JWT verification failed → Redirecting to /login');
    console.error('💣 Reason:', err.message);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// Paths where middleware should run
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
