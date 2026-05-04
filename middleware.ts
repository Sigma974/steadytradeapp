import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // ── 1. Supabase session refresh ──────────────────────────
  // Must run before any redirect so that auth cookies stay fresh.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — important: do not remove this call
  await supabase.auth.getUser();

  // ── 2. Maintenance mode ─────────────────────────────────
  // Only root + auth paths are accessible — redirect everything else to locale homepage.
  const maintenancePath = request.nextUrl.pathname;
  const normalizedPath =
    maintenancePath === "/fr"
      ? "/"
      : maintenancePath.startsWith("/fr/")
        ? maintenancePath.slice(3)
        : maintenancePath;
  const allowedPaths = new Set(["/", "/signin", "/signup"]);
  if (!allowedPaths.has(normalizedPath)) {
    const url = request.nextUrl.clone();
    url.pathname = maintenancePath.startsWith("/fr") ? "/fr" : "/";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach(({ name, value }) => {
      redirect.cookies.set(name, value);
    });
    return redirect;
  }

  // ── 3. IP-based locale redirect (first visit only) ───────
  const cookieName = "NEXT_LOCALE";
  const hasLocaleCookie = request.cookies.has(cookieName);

  if (!hasLocaleCookie) {
    const country = request.headers.get("x-vercel-ip-country");
    const pathname = request.nextUrl.pathname;
    if (country === "FR" && !pathname.startsWith("/fr")) {
      const url = request.nextUrl.clone();
      url.pathname = "/fr" + (pathname === "/" ? "" : pathname);
      const redirect = NextResponse.redirect(url);
      // Copy any auth cookies set above onto the redirect response
      response.cookies.getAll().forEach(({ name, value }) => {
        redirect.cookies.set(name, value);
      });
      redirect.cookies.set(cookieName, "fr", {
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
        sameSite: "lax",
      });
      return redirect;
    }
  }

  // ── 4. next-intl routing ─────────────────────────────────
  const intlResponse = intlMiddleware(request);

  // Copy auth cookies onto the intl response
  response.cookies.getAll().forEach(({ name, value }) => {
    intlResponse.cookies.set(name, value);
  });

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!api|auth/callback|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
