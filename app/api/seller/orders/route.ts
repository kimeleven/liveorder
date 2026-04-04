import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parsePagination, buildPaginationResponse } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const statusParam = searchParams.get('status');
  const validStatuses = ['PAID', 'SHIPPING', 'DELIVERED', 'REFUNDED', 'SETTLED'];
  const statusFilter = statusParam && validStatuses.includes(statusParam)
    ? { status: statusParam }
    : {};
  const where = { code: { product: { sellerId: session.user.id } }, ...statusFilter };

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: {
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
