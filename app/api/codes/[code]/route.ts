import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// IP rate limiting: 1분 내 10회 초과 시 429 반환 (서버리스 warm instance 내 유지)
const codeCheckRateLimit = new Map<string, { count: number; resetAt: number }>();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // IP rate limiting 체크
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const now = Date.now();
    const windowMs = 60_000; // 1분
    const maxAttempts = 10;

    const rl = codeCheckRateLimit.get(clientIp) ?? { count: 0, resetAt: now + windowMs };
    if (now > rl.resetAt) {
      rl.count = 0;
      rl.resetAt = now + windowMs;
    }
    rl.count++;
    codeCheckRateLimit.set(clientIp, rl);

    if (rl.count > maxAttempts) {
      return NextResponse.json(
        { valid: false, reason: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }

    const { code: codeKey } = await params;

    const code = await prisma.code.findUnique({
      where: { codeKey: codeKey.toUpperCase() },
      include: {
        product: {
          include: {
            seller: {
              select: {
                id: true,
                status: true,
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

    // 셀러 상태 확인 (단일 쿼리 내 include로 처리 — N+1 제거)
    if (code.product.seller.status !== "APPROVED") {
      return NextResponse.json(
        { valid: false, reason: "판매 중단된 상품입니다." },
        { status: 400 }
      );
    }

    // 응답에서 status 필드는 제외하고 반환
    const { status: _sellerStatus, ...sellerPublic } = code.product.seller;

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
      seller: sellerPublic,
    });
  } catch (error) {
    console.error("코드 검증 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
