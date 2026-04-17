import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = [
  "/login", "/signup", "/onboarding", "/nonprofit-formation",
  "/", "/pricing", "/leaderboard", "/tools", "/grant-directory",
  "/ref", "/blog", "/partners", "/privacy", "/terms",
  "/reset-password", "/update-password", "/verify-email",
  "/embed", "/score", "/share",
  "/check", "/grant-services", "/unsubscribe",
  "/grants/state", "/grants/states", "/grants/industry",
  "/api/auth", "/api/onboarding", "/api/webhooks", "/api/health",
  "/api/tools", "/api/embed", "/api/cron", "/api/partners",
  "/api/services/public-check", "/api/services/unsubscribe",
  "/sitemap.xml", "/robots.txt",
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Use getUser() instead of getSession() — getSession() reads from cookies
  // without server-side JWT validation, making it vulnerable to forgery
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
