import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = token?.role as string | undefined;

  // 셀러 영역 보호
  if (pathname.startsWith("/seller") && !pathname.startsWith("/seller/auth")) {
    if (!token) {
      const loginUrl = new URL("/seller/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role !== "seller") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // 관리자 영역 보호
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/auth")) {
    if (!token) {
      const loginUrl = new URL("/admin/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // 셀러 API 보호
  if (pathname.startsWith("/api/seller")) {
    if (!token || role !== "seller") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // 관리자 API 보호
  if (pathname.startsWith("/api/admin")) {
    if (!token || role !== "admin") {
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
