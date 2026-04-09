import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? 'daily'

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const rangeStart =
    period === 'monthly'
      ? new Date(now.getFullYear(), now.getMonth() - 11, 1)
      : period === 'weekly'
      ? new Date(now.getTime() - 11 * 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)

  const dateFormat =
    period === 'monthly' ? 'YYYY-MM' :
    period === 'weekly'  ? 'IYYY-IW' :
    'YYYY-MM-DD'

  const [
    pendingSellers,
    totalOrders,
    pendingSettlements,
    feeSum,
    todayAgg,
    monthAgg,
    rawDailySales,
    recentOrders,
    pendingSellerList,
  ] = await Promise.all([
    prisma.seller.count({ where: { status: 'PENDING' } }),
    prisma.order.count(),
    prisma.settlement.count({ where: { status: 'PENDING' } }),
    prisma.settlement
      .aggregate({ _sum: { fee: true } })
      .then(r => Number(r._sum.fee ?? 0)),
    prisma.order.aggregate({
      _sum: { amount: true },
      where: { status: { notIn: ['REFUNDED'] }, createdAt: { gte: todayStart } },
    }).then(r => Number(r._sum.amount ?? 0)),
    prisma.order.aggregate({
      _sum: { amount: true },
      where: { status: { notIn: ['REFUNDED'] }, createdAt: { gte: monthStart } },
    }).then(r => Number(r._sum.amount ?? 0)),
    prisma.$queryRaw<{ date: string; total: bigint }[]>`
      SELECT TO_CHAR("createdAt" AT TIME ZONE 'Asia/Seoul', ${dateFormat}) AS date,
             SUM(amount) AS total
      FROM "Order"
      WHERE status NOT IN ('REFUNDED') AND "createdAt" >= ${rangeStart}
      GROUP BY 1 ORDER BY 1
    `,
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        buyerName: true,
        amount: true,
        status: true,
        source: true,
        createdAt: true,
        code: { select: { product: { select: { name: true } } } },
        seller: { select: { name: true } },
      },
    }),
    prisma.seller.findMany({
      take: 5,
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
  ])

  return NextResponse.json({
    pendingSellers,
    totalOrders,
    pendingSettlements,
    totalRevenue: feeSum,
    todayRevenue: todayAgg,
    thisMonthRevenue: monthAgg,
    dailySales: rawDailySales.map(r => ({ date: r.date, total: Number(r.total) })),
    recentOrders,
    pendingSellerList,
  })
}
