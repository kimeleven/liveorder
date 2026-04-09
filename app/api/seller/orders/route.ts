import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OrderStatus } from "@prisma/client";
import { parsePagination, buildPaginationResponse } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const statusParam = searchParams.get('status');
  const statusFilter = statusParam && Object.values(OrderStatus).includes(statusParam as OrderStatus)
    ? { status: statusParam as OrderStatus }
    : {};
  const q = searchParams.get('q')?.trim() || '';
  const where = {
    code: { product: { sellerId: session.user.id } },
    ...statusFilter,
    ...(q ? {
      OR: [
        { buyerName: { contains: q, mode: 'insensitive' as const } },
        { buyerPhone: { contains: q } },
      ]
    } : {}),
  };

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      select: {
        id: true,
        buyerName: true,
        buyerPhone: true,
        quantity: true,
        amount: true,
        status: true,
        trackingNo: true,
        carrier: true,
        createdAt: true,
        source: true,
        code: {
          select: {
            codeKey: true,
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json(buildPaginationResponse(orders, total, page, limit));
}
