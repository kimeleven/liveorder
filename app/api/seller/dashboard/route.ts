import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sellerId = session.user.id;

  const [totalProducts, activeCodes, totalOrders, pendingSettlement] =
    await Promise.all([
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
    ]);

  return NextResponse.json({
    totalProducts,
    activeCodes,
    totalOrders,
    pendingSettlement,
  });
}
