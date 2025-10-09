import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout', '/api/users'];

// CORS configuration
function addCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get('origin');

  // Allow requests from localhost and network IPs in development
  const allowedOrigins = [
    'http://localhost:9002',
    'http://127.0.0.1:9002',
    'http://192.168.1.92:9002'
  ];

  // In development, be more permissive with CORS
  if (process.env.NODE_ENV === 'development') {
    if (origin && (allowedOrigins.includes(origin) || origin.includes('192.168') || origin.includes('localhost'))) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }
  }

  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(response, request);
  }

  // Skip middleware for API auth routes and static files
  if (publicRoutes.includes(pathname) ||
      pathname.startsWith('/_next/') ||
      pathname.includes('.')) {
    const response = NextResponse.next();
    if (pathname.startsWith('/api/')) {
      return addCorsHeaders(response, request);
    }
    return response;
  }

  // For now, let's disable server-side authentication checks on pages
  // and handle it purely client-side to debug the issue
  console.log('Middleware processing:', pathname);

  const response = NextResponse.next();
  if (pathname.startsWith('/api/')) {
    return addCorsHeaders(response, request);
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - login page assets
     */
    '/((?!_next/static|_next/image|favicon|public|.*\\.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
};