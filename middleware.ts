import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const cookieName = "NEXT_LOCALE";
  const hasLocaleCookie = request.cookies.has(cookieName);

  // IP-based redirect for France (first visit only — cookie not yet set)
  if (!hasLocaleCookie) {
    const country = request.headers.get("x-vercel-ip-country");
    const pathname = request.nextUrl.pathname;
    if (country === "FR" && !pathname.startsWith("/fr")) {
      const url = request.nextUrl.clone();
      url.pathname = "/fr" + (pathname === "/" ? "" : pathname);
      const response = NextResponse.redirect(url);
      response.cookies.set(cookieName, "fr", {
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
        sameSite: "lax",
      });
      return response;
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
