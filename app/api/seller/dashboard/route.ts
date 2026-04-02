import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sellerId = session.user.id;

  const [seller, totalProducts, activeCodes, totalOrders, pendingSettlement, recentOrders] =
    await Promise.all([
      prisma.seller.findUnique({ where: { id: sellerId }, select: { status: true } }),
      prisma.product.count({ where: { sellerId } }),
      prisma.code.count({
        where: {
          product: { sellerId },
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      }),
      prisma.order.count({
        where: { code: { product: { sellerId } } },
      }),
      prisma.order
        .aggregate({
          where: {
            code: { product: { sellerId } },
            status: "PAID",
          },
          _sum: { amount: true },
        })
        .then((r) => r._sum.amount ?? 0),
      prisma.order.findMany({
        where: {
          code: { product: { sellerId } },
          status: { not: "REFUNDED" },
        },
        include: {
          code: { include: { product: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const dailySalesRaw: { date: string; total: bigint }[] = await prisma.$queryRaw`
    SELECT
      TO_CHAR(gs.day AT TIME ZONE 'Asia/Seoul', 'MM/DD') as date,
      COALESCE(SUM(o.amount), 0)::bigint as total
    FROM generate_series(
      NOW() - INTERVAL '6 days', NOW(), INTERVAL '1 day'
    ) gs(day)
    LEFT JOIN orders o
      ON DATE(o.created_at AT TIME ZONE 'Asia/Seoul') = DATE(gs.day AT TIME ZONE 'Asia/Seoul')
      AND o.status != 'REFUNDED'
      AND o.code_id IN (
        SELECT c.id FROM codes c
        JOIN products p ON c.product_id = p.id
        WHERE p.seller_id = ${sellerId}::uuid
      )
    GROUP BY DATE(gs.day), TO_CHAR(gs.day AT TIME ZONE 'Asia/Seoul', 'MM/DD')
    ORDER BY DATE(gs.day) ASC
  `;
  const dailySales = dailySalesRaw.map((r) => ({ date: r.date, total: Number(r.total) }));

  return NextResponse.json({
    totalProducts,
    activeCodes,
    totalOrders,
    pendingSettlement,
    sellerStatus: seller?.status,
    recentOrders,
    dailySales,
  });
}
