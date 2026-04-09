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
