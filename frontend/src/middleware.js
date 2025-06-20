import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/subscribe', '/subscribe/success'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  console.log('🛡️ Middleware triggered for:', pathname);

  // Allow public pages to be accessed without auth
  if (PUBLIC_ROUTES.includes(pathname)) {
    console.log('🌐 Public route, continuing:', pathname);
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (!token) {
    console.warn('🚫 No token found — redirecting to /login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Use secure secret (should be from server-only env var)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);

    console.log('✅ Token verified. Proceeding.');
    return NextResponse.next();
  } catch (err) {
    console.error('❌ Token invalid — redirecting to /login:', err.message);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// This tells Next.js which paths the middleware should run on
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
