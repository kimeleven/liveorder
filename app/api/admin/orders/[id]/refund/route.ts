import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { reason, amount } = body as { reason: string; amount?: number };

  if (!reason || reason.trim().length < 5) {
    return NextResponse.json(
      { error: "환불 사유를 5자 이상 입력해주세요." },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      code: {
        include: { product: { select: { sellerId: true } } },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  const refundableStatuses = ["TRANSFER_PENDING", "CONFIRMED", "SHIPPING", "DELIVERED"];
  if (!refundableStatuses.includes(order.status)) {
    return NextResponse.json(
      { error: `현재 상태(${order.status})에서는 환불할 수 없습니다.` },
      { status: 400 }
    );
  }

  const sellerId = order.code.product.sellerId;
  const isFullRefund = !amount || amount >= order.amount;

  await prisma.$transaction([
    prisma.order.update({
      where: { id },
      data: isFullRefund ? { status: "REFUNDED" } : {},
    }),
    prisma.sellerAuditLog.create({
      data: {
        sellerId,
        action: "REFUND",
        detail: {
          orderId: id,
          reason: reason.trim(),
          amount: amount ?? order.amount,
          refundedBy: session.user.id,
          note: "수동 환불 — 송금 방식 주문",
        },
      },
    }),
  ]);

  return NextResponse.json({ success: true, refundedAt: new Date().toISOString() });
}
