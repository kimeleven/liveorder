import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parsePagination, buildPaginationResponse } from "@/lib/pagination";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const { page, limit, skip } = parsePagination(searchParams);

  const code = await prisma.code.findFirst({
    where: { id, product: { sellerId: session.user.id } },
    include: {
      product: { select: { id: true, name: true, price: true, imageUrl: true } },
    },
  });
  if (!code) {
    return NextResponse.json({ error: "코드를 찾을 수 없습니다." }, { status: 404 });
  }

  const [orders, total, statsAgg] = await prisma.$transaction([
    prisma.order.findMany({
      where: { codeId: id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        buyerName: true,
        buyerPhone: true,
        quantity: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.order.count({ where: { codeId: id } }),
    prisma.order.aggregate({
      where: { codeId: id, status: { not: "REFUNDED" } },
      _sum: { amount: true },
      _avg: { amount: true },
      _count: { id: true },
    }),
  ]);

  const maskedOrders = orders.map((o) => ({
    ...o,
    buyerPhone: o.buyerPhone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, "***-****-$3"),
  }));

  const { pagination } = buildPaginationResponse(orders, total, page, limit);

  return NextResponse.json({
    code,
    stats: {
      totalOrders: statsAgg._count.id,
      totalRevenue: statsAgg._sum.amount ?? 0,
      avgOrderAmount: Math.round(Number(statsAgg._avg.amount ?? 0)),
    },
    orders: maskedOrders,
    pagination,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.code.findFirst({
    where: { id, product: { sellerId: session.user.id } },
  });
  if (!existing)
    return NextResponse.json({ error: "코드를 찾을 수 없습니다." }, { status: 404 });

  const { expiresAt, maxQty } = body;
  const updateData: Record<string, unknown> = {};

  if (expiresAt !== undefined) {
    const d = new Date(expiresAt);
    if (isNaN(d.getTime()))
      return NextResponse.json({ error: "유효하지 않은 날짜입니다." }, { status: 400 });
    if (d <= new Date())
      return NextResponse.json(
        { error: "만료일은 현재 시간보다 이후여야 합니다." },
        { status: 400 }
      );
    updateData.expiresAt = d;
  }

  if (maxQty !== undefined) {
    const qty = Number(maxQty);
    if (!Number.isInteger(qty) || qty < 0)
      return NextResponse.json(
        { error: "최대 주문 수량은 0 이상의 정수여야 합니다." },
        { status: 400 }
      );
    if (qty > 0 && qty < existing.usedQty)
      return NextResponse.json(
        {
          error: `이미 ${existing.usedQty}건 주문됨. 최대 수량은 ${existing.usedQty} 이상이어야 합니다.`,
        },
        { status: 400 }
      );
    updateData.maxQty = qty;
  }

  if (Object.keys(updateData).length === 0)
    return NextResponse.json({ error: "변경할 필드가 없습니다." }, { status: 400 });

  const updated = await prisma.code.update({ where: { id }, data: updateData });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const code = await prisma.code.findFirst({
    where: { id, product: { sellerId: session.user.id } },
    include: { _count: { select: { orders: true } } },
  });
  if (!code)
    return NextResponse.json({ error: "코드를 찾을 수 없습니다." }, { status: 404 });

  if (code._count.orders > 0)
    return NextResponse.json(
      {
        error: `주문이 ${code._count.orders}건 있는 코드는 삭제할 수 없습니다. 비활성화를 사용하세요.`,
      },
      { status: 409 }
    );

  await prisma.code.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
