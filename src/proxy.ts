import NextAuth from 'next-auth';
import authConfig from '@/auth.config';
import { getSafeReturnPath } from '@/lib/auth-return-path';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isInvite = req.nextUrl.pathname.startsWith('/invite');

  if (req.auth && req.nextUrl.pathname === '/login') {
    const callbackUrls = req.nextUrl.searchParams.getAll('callbackUrl');
    const returnPath = getSafeReturnPath(callbackUrls.length === 1 ? callbackUrls[0] : undefined);
    const newUrl = new URL(returnPath, req.nextUrl.origin);
    return Response.redirect(newUrl);
  }

  if (!req.auth && req.nextUrl.pathname !== '/login' && !isInvite) {
    const newUrl = new URL('/login', req.nextUrl.origin);
    newUrl.searchParams.set('callbackUrl', `${req.nextUrl.pathname}${req.nextUrl.search}`);
    return Response.redirect(newUrl);
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
