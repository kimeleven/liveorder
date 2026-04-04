import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PORTONE_BASE = "https://api.portone.io";

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

  const refundableStatuses = ["PAID", "SHIPPING", "DELIVERED"];
  if (!refundableStatuses.includes(order.status)) {
    return NextResponse.json(
      { error: `현재 상태(${order.status})에서는 환불할 수 없습니다.` },
      { status: 400 }
    );
  }

  if (!order.pgTid) {
    return NextResponse.json(
      { error: "PG 거래번호가 없어 환불을 처리할 수 없습니다." },
      { status: 400 }
    );
  }

  // PortOne 환불 API 호출
  const portoneRes = await fetch(
    `${PORTONE_BASE}/payments/${encodeURIComponent(order.pgTid)}/cancel`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
      },
      body: JSON.stringify({
        reason: reason.trim(),
        ...(amount ? { cancelAmount: amount } : {}),
      }),
    }
  );

  if (!portoneRes.ok) {
    const portoneError = await portoneRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: `PG 환불 실패: ${portoneError.message ?? portoneRes.status}` },
      { status: 502 }
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
        },
      },
    }),
  ]);

  return NextResponse.json({ success: true, refundedAt: new Date().toISOString() });
}
