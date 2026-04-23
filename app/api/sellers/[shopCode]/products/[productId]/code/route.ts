import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shopCode: string; productId: string }> }
) {
  const { shopCode, productId } = await params;

  // 셀러 확인
  const seller = await prisma.seller.findUnique({
    where: { shopCode },
    select: {
      id: true,
      name: true,
      businessNo: true,
      tradeRegNo: true,
      address: true,
      phone: true,
      email: true,
      status: true,
    },
  });

  if (!seller || seller.status !== "APPROVED") {
    return NextResponse.json({ error: "유효하지 않은 쇼핑몰입니다." }, { status: 403 });
  }

  // 상품 확인 (이 셀러 소유인지)
  const product = await prisma.product.findFirst({
    where: { id: productId, sellerId: seller.id, isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      imageUrl: true,
      category: true,
    },
  });

  if (!product) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
  }

  // 사용 가능한 코드 조회 (활성, 미만료)
  const codes = await prisma.code.findMany({
    where: { productId, isActive: true, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
  });

  const availableCode = codes.find((c) => c.maxQty === 0 || c.usedQty < c.maxQty);

  if (!availableCode) {
    return NextResponse.json({ error: "현재 주문 가능한 코드가 없습니다." }, { status: 404 });
  }

  const remainingQty = availableCode.maxQty > 0 ? availableCode.maxQty - availableCode.usedQty : null;

  return NextResponse.json({
    code: { id: availableCode.id, codeKey: availableCode.codeKey, remainingQty },
    product,
    seller: {
      id: seller.id,
      name: seller.name,
      businessNo: seller.businessNo,
      tradeRegNo: seller.tradeRegNo,
      address: seller.address,
      phone: seller.phone,
      email: seller.email,
    },
  });
}
