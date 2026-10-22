import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "campuscode_session";

/**
 * Routes that require a signed-in student. The presence of the session cookie
 * is enough to gate the request here so the browser gets a real 307 instead of
 * an empty shell followed by a client-side redirect. The server components
 * still validate the session itself.
 */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/friends",
  "/groups",
  "/settings",
  "/notifications",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  if (!isProtected) return NextResponse.next();

  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/friends/:path*",
    "/groups/:path*",
    "/settings/:path*",
    "/notifications/:path*",
  ],
};
