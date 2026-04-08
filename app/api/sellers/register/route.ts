import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail, ADMIN_EMAIL } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      businessNo,
      name,
      repName,
      address,
      phone,
      bankAccount,
      bankName,
      tradeRegNo,
      bizRegImageUrl,
    } = body;

    if (!email || !password || !businessNo || !name || !repName || !address || !phone || !bizRegImageUrl) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요. (사업자등록증 이미지 포함)" },
        { status: 400 }
      );
    }

    const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: "연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)" },
        { status: 400 }
      );
    }

    const existing = await prisma.seller.findFirst({
      where: { OR: [{ email }, { businessNo }] },
    });
    if (existing) {
      return NextResponse.json(
        { error: "이미 등록된 이메일 또는 사업자번호입니다." },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 8);
    const emailVerifyToken = randomBytes(32).toString("hex");

    const seller = await prisma.seller.create({
      data: {
        email,
        password: hashedPassword,
        businessNo,
        name,
        repName,
        address,
        phone,
        bankAccount,
        bankName,
        tradeRegNo,
        bizRegImageUrl,
        status: "PENDING",
        emailVerified: false,
        emailVerifyToken,
        emailVerifyTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/api/seller/auth/verify?token=${emailVerifyToken}`;

    // 셀러에게 이메일 인증 링크 발송
    await sendEmail(
      seller.email,
      "[LiveOrder] 이메일 인증을 완료해주세요",
      `<p>안녕하세요, LiveOrder에 가입해주셔서 감사합니다!</p>
      <p>아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;">이메일 인증하기</a></p>
      <p style="color:#888;font-size:12px;">인증 후 관리자 승인까지 영업일 기준 1~2일이 소요될 수 있습니다.</p>`
    );

    // 관리자에게 신규 셀러 가입 알림
    await sendEmail(
      ADMIN_EMAIL,
      '[LiveOrder] 신규 셀러 가입 승인 요청',
      `<p>새 셀러가 가입 승인을 요청했습니다.</p>
      <ul>
        <li>상호명: ${seller.name}</li>
        <li>이메일: ${seller.email}</li>
        <li>사업자번호: ${seller.businessNo}</li>
      </ul>
      <p>관리자 페이지에서 승인 처리해 주세요.</p>`
    );

    return NextResponse.json(
      { id: seller.id, message: "셀러 등록이 완료되었습니다. 이메일 인증 후 관리자 승인을 기다려주세요." },
      { status: 201 }
    );
  } catch (error) {
    console.error("셀러 등록 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
