import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seller = await prisma.seller.findUnique({
    where: { id: session.user.id },
    select: {
      status: true,
      name: true,
      email: true,
      repName: true,
      businessNo: true,
      phone: true,
      address: true,
      bankAccount: true,
      bankName: true,
      tradeRegNo: true,
      shopCode: true,
      kakaoPayId: true,
      plan: true,
      createdAt: true,
    },
  });

  if (!seller) {
    return NextResponse.json({ error: "Seller not found" }, { status: 404 });
  }

  return NextResponse.json(seller);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const allowed = [
    "phone",
    "address",
    "bankAccount",
    "bankName",
    "tradeRegNo",
    "shopCode",
    "kakaoPayId",
  ] as const;
  const data: Record<string, string> = {};
  for (const key of allowed) {
    if (typeof body[key] === "string") data[key] = body[key].trim();
  }

  // shopCode 유효성: 영소문자+숫자 6자리
  if (data.shopCode !== undefined) {
    if (!/^[a-z0-9]{6}$/.test(data.shopCode)) {
      return NextResponse.json(
        { error: "shopCode는 영소문자+숫자 6자리여야 합니다." },
        { status: 400 }
      );
    }
    // 중복 체크
    const existing = await prisma.seller.findUnique({
      where: { shopCode: data.shopCode },
    });
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json(
        { error: "이미 사용 중인 shopCode입니다." },
        { status: 409 }
      );
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const seller = await prisma.seller.update({
    where: { id: session.user.id },
    data,
    select: {
      phone: true,
      address: true,
      bankAccount: true,
      bankName: true,
      tradeRegNo: true,
      shopCode: true,
      kakaoPayId: true,
    },
  });

  return NextResponse.json(seller);
}
