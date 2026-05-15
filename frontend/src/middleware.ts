import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware.
 * Runs before every matched route. Use for auth guards, redirects, etc.
 *
 * TODO(M2 — Ben, Tasks 2.1 + 2.8): When AuthProvider lands and a SuperUser
 * session cookie/header exists, wire the real `/Admin/:path*` gate here.
 *
 * Until then:
 *   - `/Admin` is gated CLIENT-SIDE via a wallet+role probe in
 *     [Admin/page.tsx](./app/Admin/page.tsx) (Module 1 CP4 placeholder).
 *   - The corresponding API endpoints under `/api/admin/*` are gated
 *     SERVER-SIDE via `verifyWalletAuth(req, { role: ['superuser'] })`
 *     (Module 1 CP3) — see frontend/docs/AUTH_CONTRACT.md.
 *
 * Example for the server-side wiring:
 *
 *   if (request.nextUrl.pathname.startsWith('/Admin')) {
 *     const session = request.cookies.get('agartha-session');
 *     if (!session || decodeSession(session.value).role !== 'superuser') {
 *       return NextResponse.redirect(new URL('/', request.url));
 *     }
 *   }
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (browser favicon)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
