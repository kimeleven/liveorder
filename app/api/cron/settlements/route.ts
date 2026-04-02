import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const PLATFORM_FEE_RATE = Number(process.env.PLATFORM_FEE_RATE) || 0.025;
const PG_FEE_RATE = 0.022; // 포트원 + 이니시스 ~2.2%
const SETTLEMENT_DELAY_DAYS = Number(process.env.SETTLEMENT_DELAY_DAYS) || 3;

export async function POST(req: NextRequest) {
  // CRON_SECRET 인증: Vercel Cron 또는 수동 트리거 모두 Authorization 헤더 필요
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "인증 실패" }, { status: 401 });
    }
  }
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
        const settlement = await tx.settlement.create({
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

        // 주문 상태를 SETTLED로 변경 + settlementId 연결
        await tx.order.updateMany({
          where: { id: { in: group.orderIds } },
          data: { status: "SETTLED", settlementId: settlement.id },
        });
      });

      // 셀러에게 정산 완료 알림
      const seller = await prisma.seller.findUnique({
        where: { id: group.sellerId },
        select: { email: true, name: true },
      });
      if (seller) {
        await sendEmail(
          seller.email,
          '[LiveOrder] 정산이 완료되었습니다',
          `<p>${seller.name} 님, 정산이 완료되었습니다.</p>
          <ul>
            <li>총 결제금액: ${group.totalAmount.toLocaleString()}원</li>
            <li>플랫폼 수수료: ${fee.toLocaleString()}원</li>
            <li>PG 수수료: ${pgFee.toLocaleString()}원</li>
            <li>정산 금액: ${netAmount.toLocaleString()}원</li>
          </ul>
          <p>셀러 대시보드 정산 탭에서 상세 내역을 확인해 주세요.</p>`
        );
      }

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
