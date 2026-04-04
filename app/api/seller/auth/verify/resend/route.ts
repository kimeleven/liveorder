import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "이메일이 필요합니다." }, { status: 400 });
    }

    const seller = await prisma.seller.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!seller) {
      // 보안상 존재 여부를 알려주지 않음
      return NextResponse.json({ message: "인증 메일을 발송했습니다." });
    }

    if (seller.emailVerified) {
      return NextResponse.json({ error: "이미 인증된 이메일입니다." }, { status: 400 });
    }

    const token = randomBytes(32).toString("hex");
    await prisma.seller.update({
      where: { id: seller.id },
      data: {
        emailVerifyToken: token,
        emailVerifyTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/api/seller/auth/verify?token=${token}`;

    await sendEmail(
      seller.email,
      "[LiveOrder] 이메일 인증 링크",
      `<p>안녕하세요, LiveOrder입니다.</p>
      <p>아래 링크를 클릭하여 이메일 인증을 완료해주세요.</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;">이메일 인증하기</a></p>
      <p style="color:#888;font-size:12px;">링크는 24시간 이내에 사용해주세요.</p>`
    );

    return NextResponse.json({ message: "인증 메일을 발송했습니다." });
  } catch (error) {
    console.error("[email-verify-resend]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
