import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";

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
    } = body;

    if (!email || !password || !businessNo || !name || !repName || !address || !phone) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요." },
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
        status: "PENDING",
      },
    });

    return NextResponse.json(
      { id: seller.id, message: "셀러 등록이 완료되었습니다. 관리자 승인을 기다려주세요." },
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
