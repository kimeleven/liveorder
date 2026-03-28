import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 셀러 영역 보호 (로그인/등록 페이지 제외)
  if (pathname.startsWith("/seller") && !pathname.startsWith("/seller/auth")) {
    if (!req.auth) {
      const loginUrl = new URL("/seller/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (req.auth.user.role !== "seller") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // 관리자 영역 보호 (로그인 페이지 제외)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/auth")) {
    if (!req.auth) {
      const loginUrl = new URL("/admin/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (req.auth.user.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // 셀러 API 보호
  if (pathname.startsWith("/api/seller")) {
    if (!req.auth || req.auth.user.role !== "seller") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // 관리자 API 보호
  if (pathname.startsWith("/api/admin")) {
    if (!req.auth || req.auth.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/seller/:path*",
    "/admin/:path*",
    "/api/seller/:path*",
    "/api/admin/:path*",
  ],
};
