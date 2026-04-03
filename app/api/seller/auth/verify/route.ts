import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/seller/auth/verify?status=invalid", req.url)
    );
  }

  try {
    const seller = await prisma.seller.findFirst({
      where: { emailVerifyToken: token },
      select: { id: true, emailVerified: true, emailVerifyTokenExpiresAt: true },
    });

    if (!seller) {
      return NextResponse.redirect(
        new URL("/seller/auth/verify?status=invalid", req.url)
      );
    }

    if (seller.emailVerifyTokenExpiresAt && seller.emailVerifyTokenExpiresAt < new Date()) {
      return NextResponse.redirect(
        new URL("/seller/auth/verify?status=expired", req.url)
      );
    }

    if (seller.emailVerified) {
      return NextResponse.redirect(
        new URL("/seller/auth/verify?status=already", req.url)
      );
    }

    await prisma.seller.update({
      where: { id: seller.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyTokenExpiresAt: null,
      },
    });

    return NextResponse.redirect(
      new URL("/seller/auth/verify?status=success", req.url)
    );
  } catch (error) {
    console.error("[email-verify]", error);
    return NextResponse.redirect(
      new URL("/seller/auth/verify?status=error", req.url)
    );
  }
}
