import { NextRequest, NextResponse } from "next/server";
import { hkdf } from "@panva/hkdf";
import { jwtDecrypt } from "jose";

const COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

async function getRole(req: NextRequest): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  let token: string | undefined;
  for (const name of COOKIE_NAMES) {
    const val = req.cookies.get(name)?.value;
    if (val) { token = val; break; }
  }
  if (!token) return null;

  try {
    const salt = "authjs.session-token";
    const keyMaterial = new TextEncoder().encode(secret);
    const derived = await hkdf(
      "sha256",
      keyMaterial,
      salt,
      `Auth.js Generated Encryption Key (${salt})`,
      64
    );
    const { payload } = await jwtDecrypt(token, derived);
    return (payload as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = await getRole(req);

  if (pathname.startsWith("/seller") && !pathname.startsWith("/seller/auth")) {
    if (!role) {
      const url = new URL("/seller/auth/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (role !== "seller") return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/auth")) {
    if (!role) {
      const url = new URL("/admin/auth/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (role !== "admin") return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/api/seller")) {
    if (!role || role !== "seller")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (pathname.startsWith("/api/admin")) {
    if (!role || role !== "admin")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
