import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sellerId = session.user.id;
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') ?? 'daily'; // 'daily' | 'weekly' | 'monthly'

  const [seller, totalProducts, activeCodes, totalOrders, pendingSettlement, recentOrders] =
    await Promise.all([
      prisma.seller.findUnique({ where: { id: sellerId }, select: { status: true, emailVerified: true } }),
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

  let salesRows: { date: string; orders: bigint; revenue: bigint }[];

  if (period === 'weekly') {
    salesRows = await prisma.$queryRaw`
      SELECT
        TO_CHAR(DATE_TRUNC('week', o.created_at AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD') AS date,
        COUNT(*)::bigint AS orders,
        COALESCE(SUM(o.amount), 0)::bigint AS revenue
      FROM orders o
      JOIN codes c ON c.id = o.code_id
      JOIN products p ON p.id = c.product_id
      WHERE p.seller_id = ${sellerId}::uuid
        AND o.status NOT IN ('REFUNDED')
        AND o.created_at >= NOW() - INTERVAL '8 weeks'
      GROUP BY DATE_TRUNC('week', o.created_at AT TIME ZONE 'Asia/Seoul')
      ORDER BY 1
    `;
  } else if (period === 'monthly') {
    salesRows = await prisma.$queryRaw`
      SELECT
        TO_CHAR(DATE_TRUNC('month', o.created_at AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD') AS date,
        COUNT(*)::bigint AS orders,
        COALESCE(SUM(o.amount), 0)::bigint AS revenue
      FROM orders o
      JOIN codes c ON c.id = o.code_id
      JOIN products p ON p.id = c.product_id
      WHERE p.seller_id = ${sellerId}::uuid
        AND o.status NOT IN ('REFUNDED')
        AND o.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', o.created_at AT TIME ZONE 'Asia/Seoul')
      ORDER BY 1
    `;
  } else {
    // daily: 기존 7일 로직 (generate_series로 빈 날짜 포함)
    const dailySalesRaw: { date: string; total: bigint }[] = await prisma.$queryRaw`
      SELECT
        TO_CHAR(gs.day AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') as date,
        COALESCE(SUM(o.amount), 0)::bigint as revenue
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
      GROUP BY DATE(gs.day), TO_CHAR(gs.day AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')
      ORDER BY DATE(gs.day) ASC
    `;
    salesRows = dailySalesRaw.map((r) => ({ date: r.date, orders: BigInt(0), revenue: r.total }));
  }

  const dailySales = salesRows.map((r) => ({ date: r.date, total: Number(r.revenue) }));

  // 채널별 주문 통계 (최근 30일, 환불 제외)
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const channelStats = await prisma.order.groupBy({
    by: ['source'],
    where: {
      code: { product: { sellerId } },
      status: { notIn: ['REFUNDED'] },
      createdAt: { gte: thirtyDaysAgo },
    },
    _count: { id: true },
    _sum: { amount: true },
  })

  const kakaoStat = channelStats.find(s => s.source === 'kakao')
  const webStat = channelStats.find(s => s.source === 'web')

  const channelSummary = {
    kakao: {
      count: kakaoStat?._count.id ?? 0,
      amount: Number(kakaoStat?._sum.amount ?? 0),
    },
    web: {
      count: webStat?._count.id ?? 0,
      amount: Number(webStat?._sum.amount ?? 0),
    },
  }

  return NextResponse.json({
    totalProducts,
    activeCodes,
    totalOrders,
    pendingSettlement,
    sellerStatus: seller?.status,
    emailVerified: seller?.emailVerified ?? true,
    recentOrders,
    dailySales,
    channelStats: channelSummary,
  });
}
