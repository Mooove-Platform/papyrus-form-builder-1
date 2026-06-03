import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const IS_LOCAL_MODE = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';
const PUBLIC_ROUTES = ['/f/', '/api/submit/'];

export async function middleware(request: NextRequest) {
  // En mode local, pas d'auth — on laisse passer.
  if (IS_LOCAL_MODE) return NextResponse.next();

  const isPublic = PUBLIC_ROUTES.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );
  if (isPublic) return NextResponse.next();

  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
