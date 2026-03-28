import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [pendingSellers, totalOrders, pendingSettlements, feeSum] =
    await Promise.all([
      prisma.seller.count({ where: { status: "PENDING" } }),
      prisma.order.count(),
      prisma.settlement.count({ where: { status: "PENDING" } }),
      prisma.settlement
        .aggregate({ _sum: { fee: true } })
        .then((r) => r._sum.fee ?? 0),
    ]);

  return NextResponse.json({
    pendingSellers,
    totalOrders,
    pendingSettlements,
    totalRevenue: feeSum,
  });
}
