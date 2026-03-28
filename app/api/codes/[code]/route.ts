import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code: codeKey } = await params;

    const code = await prisma.code.findUnique({
      where: { codeKey: codeKey.toUpperCase() },
      include: {
        product: {
          include: {
            seller: {
              select: {
                id: true,
                name: true,
                businessNo: true,
                tradeRegNo: true,
                address: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!code) {
      return NextResponse.json(
        { valid: false, reason: "존재하지 않는 코드입니다." },
        { status: 404 }
      );
    }

    if (!code.isActive) {
      return NextResponse.json(
        { valid: false, reason: "일시 중단된 코드입니다." },
        { status: 400 }
      );
    }

    if (code.expiresAt < new Date()) {
      return NextResponse.json(
        { valid: false, reason: "만료된 코드입니다." },
        { status: 400 }
      );
    }

    if (code.maxQty > 0 && code.usedQty >= code.maxQty) {
      return NextResponse.json(
        { valid: false, reason: "품절되었습니다." },
        { status: 400 }
      );
    }

    if (code.product.seller.id) {
      // 셀러 상태 확인은 별도로
      const seller = await prisma.seller.findUnique({
        where: { id: code.product.seller.id },
        select: { status: true },
      });
      if (seller?.status !== "APPROVED") {
        return NextResponse.json(
          { valid: false, reason: "판매 중단된 상품입니다." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      valid: true,
      code: {
        id: code.id,
        codeKey: code.codeKey,
        expiresAt: code.expiresAt,
        maxQty: code.maxQty,
        usedQty: code.usedQty,
        remainingQty: code.maxQty > 0 ? code.maxQty - code.usedQty : null,
      },
      product: {
        id: code.product.id,
        name: code.product.name,
        description: code.product.description,
        price: code.product.price,
        imageUrl: code.product.imageUrl,
        category: code.product.category,
      },
      seller: code.product.seller,
    });
  } catch (error) {
    console.error("코드 검증 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
