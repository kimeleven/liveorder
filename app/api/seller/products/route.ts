import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateCodeKey } from "@/lib/code-generator";
import { parsePagination, buildPaginationResponse } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const where = { sellerId: session.user.id, isActive: true };

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json(buildPaginationResponse(products, total, page, limit));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 셀러 승인 상태 확인
  const seller = await prisma.seller.findUnique({ where: { id: session.user.id } });
  if (seller?.status !== "APPROVED") {
    return NextResponse.json(
      { error: "관리자 승인 후 이용 가능합니다. 승인 대기 중입니다." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { name, description, price, stock, category, imageUrl } = body;

    if (!name || !price || !category) {
      return NextResponse.json(
        { error: "상품명, 가격, 카테고리는 필수입니다." },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        sellerId: session.user.id,
        name,
        description,
        price: Number(price),
        stock: Number(stock) || 0,
        category,
        imageUrl,
      },
    });

    // 상품 등록 후 코드 1개 자동 발급 (유효기간 24시간, 무제한 수량)
    let autoCode = null;
    try {
      let codeKey: string;
      let attempts = 0;
      do {
        codeKey = generateCodeKey(session.user.id);
        const existing = await prisma.code.findUnique({ where: { codeKey } });
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      if (attempts < 10) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        autoCode = await prisma.code.create({
          data: { productId: product.id, codeKey, expiresAt, maxQty: 0 },
        });
      }
    } catch {
      // 코드 자동 발급 실패 시 상품 등록은 유지
    }

    return NextResponse.json({ ...product, autoCode }, { status: 201 });
  } catch (error) {
    console.error("상품 등록 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
