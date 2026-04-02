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

  return NextResponse.json({
    totalProducts,
    activeCodes,
    totalOrders,
    pendingSettlement,
    sellerStatus: seller?.status,
    recentOrders,
  });
}
