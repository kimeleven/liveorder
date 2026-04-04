import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

function hasSession(req: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => !!req.cookies.get(name)?.value);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const loggedIn = hasSession(req);

  // 페이지: 로그인 여부만 확인 (role은 layout server component에서 검증)
  if (pathname.startsWith("/seller") && !pathname.startsWith("/seller/auth")) {
    if (!loggedIn) {
      const url = new URL("/seller/auth/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/auth")) {
    if (!loggedIn) {
      const url = new URL("/admin/auth/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  // API: 쿠키 없으면 401
  if (pathname.startsWith("/api/seller") || pathname.startsWith("/api/admin")) {
    if (!loggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/seller/:path*",
    "/admin/:path*",
    "/api/seller/:path*",
    "/api/admin/:path*",
  ],
};
