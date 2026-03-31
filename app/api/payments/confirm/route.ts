import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPayment } from "@/lib/portone";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      portonePaymentId,
      codeId,
      buyerName,
      buyerPhone,
      address,
      addressDetail,
      memo,
      quantity,
      amount,
    } = body;

    if (
      !portonePaymentId ||
      !codeId ||
      !buyerName ||
      !buyerPhone ||
      !address ||
      !quantity ||
      !amount
    ) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요." },
        { status: 400 }
      );
    }

    // PortOne API로 결제 검증
    const portoneData = await getPayment(portonePaymentId);

    if (portoneData.status !== "PAID") {
      return NextResponse.json(
        { error: `결제 상태가 올바르지 않습니다: ${portoneData.status}` },
        { status: 400 }
      );
    }

    if (portoneData.amount.total !== Number(amount)) {
      return NextResponse.json(
        { error: "결제 금액이 일치하지 않습니다." },
        { status: 400 }
      );
    }

    // 코드 유효성 재확인
    const code = await prisma.code.findUnique({
      where: { id: codeId },
      include: { product: true },
    });

    if (!code || !code.isActive) {
      return NextResponse.json(
        { error: "유효하지 않은 코드입니다." },
        { status: 400 }
      );
    }

    if (code.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "만료된 코드입니다." },
        { status: 400 }
      );
    }

    if (
      code.maxQty > 0 &&
      code.usedQty + Number(quantity) > code.maxQty
    ) {
      return NextResponse.json(
        { error: "주문 수량이 남은 수량을 초과합니다." },
        { status: 400 }
      );
    }

    // 주문 생성 + 코드 수량 업데이트 (트랜잭션)
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          codeId,
          buyerName,
          buyerPhone,
          address,
          addressDetail,
          memo,
          quantity: Number(quantity),
          amount: Number(amount),
          status: "PAID",
          pgTid: portonePaymentId,
        },
      });

      await tx.code.update({
        where: { id: codeId },
        data: { usedQty: { increment: Number(quantity) } },
      });

      return newOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("결제 확인 오류:", error);
    return NextResponse.json(
      { error: "결제 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
