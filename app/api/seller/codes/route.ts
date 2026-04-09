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

  const status = searchParams.get('status') ?? 'all'
  const q = searchParams.get('q')?.trim() ?? ''
  const now = new Date()

  const statusFilter =
    status === 'active'   ? { isActive: true, expiresAt: { gt: now } } :
    status === 'expired'  ? { expiresAt: { lte: now } } :
    status === 'inactive' ? { isActive: false, expiresAt: { gt: now } } :
    {}

  const searchFilter = q ? {
    OR: [
      { codeKey: { contains: q, mode: 'insensitive' as const } },
      { product: { name: { contains: q, mode: 'insensitive' as const } } },
    ]
  } : {}

  const where = {
    product: { sellerId: session.user.id },
    ...statusFilter,
    ...searchFilter,
  };

  const [codes, total] = await prisma.$transaction([
    prisma.code.findMany({
      where,
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.code.count({ where }),
  ]);

  return NextResponse.json(buildPaginationResponse(codes, total, page, limit));
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
    const { productId, expiresInHours, maxQty } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "상품을 선택해주세요." },
        { status: 400 }
      );
    }

    // 상품이 셀러 본인의 것이고 활성 상태인지 확인
    const product = await prisma.product.findFirst({
      where: { id: productId, sellerId: session.user.id, isActive: true },
    });
    if (!product) {
      return NextResponse.json(
        { error: "상품을 찾을 수 없거나 비활성 상태입니다." },
        { status: 404 }
      );
    }

    // 코드 생성 (중복 방지 재시도)
    let codeKey: string;
    let attempts = 0;
    do {
      codeKey = generateCodeKey(session.user.id);
      const existing = await prisma.code.findUnique({
        where: { codeKey },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return NextResponse.json(
        { error: "코드 생성에 실패했습니다. 다시 시도해주세요." },
        { status: 500 }
      );
    }

    const hours = Number(expiresInHours) || 24;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const code = await prisma.code.create({
      data: {
        productId,
        codeKey,
        expiresAt,
        maxQty: Number(maxQty) || 0,
      },
    });

    return NextResponse.json(code, { status: 201 });
  } catch (error) {
    console.error("코드 발급 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
