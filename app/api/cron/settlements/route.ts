import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const PLATFORM_FEE_RATE = Number(process.env.PLATFORM_FEE_RATE) || 0.025;
const PG_FEE_RATE = 0.022; // 포트원 + 이니시스 ~2.2%
const SETTLEMENT_DELAY_DAYS = Number(process.env.SETTLEMENT_DELAY_DAYS) || 3;

export async function POST() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - SETTLEMENT_DELAY_DAYS);

    // D+3이 지난 결제완료 주문 중 아직 정산되지 않은 것들
    const eligibleOrders = await prisma.order.findMany({
      where: {
        status: "PAID",
        createdAt: { lte: cutoffDate },
      },
      include: {
        code: {
          include: {
            product: {
              include: { seller: true },
            },
          },
        },
      },
    });

    // 셀러별 그룹핑
    const sellerGroups = new Map<
      string,
      { sellerId: string; totalAmount: number; orderIds: string[] }
    >();

    for (const order of eligibleOrders) {
      const sellerId = order.code.product.sellerId;
      const group = sellerGroups.get(sellerId) ?? {
        sellerId,
        totalAmount: 0,
        orderIds: [],
      };
      group.totalAmount += order.amount;
      group.orderIds.push(order.id);
      sellerGroups.set(sellerId, group);
    }

    let processed = 0;

    for (const group of sellerGroups.values()) {
      const fee = Math.round(group.totalAmount * PLATFORM_FEE_RATE);
      const pgFee = Math.round(group.totalAmount * PG_FEE_RATE);
      const netAmount = group.totalAmount - fee - pgFee;

      await prisma.$transaction(async (tx) => {
        // 정산 레코드 생성
        await tx.settlement.create({
          data: {
            sellerId: group.sellerId,
            amount: group.totalAmount,
            fee,
            pgFee,
            netAmount,
            status: "COMPLETED",
            scheduledAt: new Date(),
            settledAt: new Date(),
          },
        });

        // 주문 상태를 SETTLED로 변경
        await tx.order.updateMany({
          where: { id: { in: group.orderIds } },
          data: { status: "SETTLED" },
        });
      });

      processed++;
    }

    return NextResponse.json({
      processed,
      totalOrders: eligibleOrders.length,
    });
  } catch (error) {
    console.error("정산 배치 오류:", error);
    return NextResponse.json({ error: "정산 처리 실패" }, { status: 500 });
  }
}
