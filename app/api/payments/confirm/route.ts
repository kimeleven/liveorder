import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPayment } from "@/lib/portone";
import { sendEmail } from "@/lib/email";

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

    const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
    if (!phoneRegex.test(buyerPhone)) {
      return NextResponse.json(
        { error: "연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)" },
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

    // 코드 기본 유효성 확인 (트랜잭션 전 빠른 사전 검사)
    const codeCheck = await prisma.code.findUnique({
      where: { id: codeId },
      select: { isActive: true, expiresAt: true },
    });

    if (!codeCheck || !codeCheck.isActive) {
      return NextResponse.json(
        { error: "유효하지 않은 코드입니다." },
        { status: 400 }
      );
    }

    if (codeCheck.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "만료된 코드입니다." },
        { status: 400 }
      );
    }

    // 주문 생성 + 코드 수량 업데이트 (트랜잭션)
    // 수량 초과 검사를 트랜잭션 내부에서 원자적 조건부 UPDATE로 처리
    // → 동시 요청 레이스 컨디션 방지
    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        // 조건부 UPDATE: maxQty=0(무제한)이거나 usedQty + quantity <= maxQty인 경우에만 증가
        const updated = await tx.$queryRaw<{ id: string }[]>`
          UPDATE "Code"
          SET "usedQty" = "usedQty" + ${Number(quantity)}
          WHERE id = ${codeId}::uuid
            AND "isActive" = true
            AND "expiresAt" > NOW()
            AND ("maxQty" = 0 OR "usedQty" + ${Number(quantity)} <= "maxQty")
          RETURNING id
        `;

        if (updated.length === 0) {
          throw new Error("QUANTITY_EXCEEDED");
        }

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

        return newOrder;
      });
    } catch (err) {
      if (err instanceof Error && err.message === "QUANTITY_EXCEEDED") {
        return NextResponse.json(
          { error: "주문 수량이 남은 수량을 초과합니다." },
          { status: 400 }
        );
      }
      throw err;
    }

    // 셀러에게 신규 주문 알림
    const codeWithSeller = await prisma.code.findUnique({
      where: { id: codeId },
      include: { product: { include: { seller: true } } },
    });
    if (codeWithSeller?.product?.seller) {
      const seller = codeWithSeller.product.seller;
      await sendEmail(
        seller.email,
        '[LiveOrder] 새 주문이 접수되었습니다',
        `<p>${seller.name} 님, 새 주문이 접수되었습니다.</p>
        <ul>
          <li>상품: ${codeWithSeller.product.name}</li>
          <li>주문자: ${buyerName}</li>
          <li>수량: ${quantity}개</li>
          <li>금액: ${Number(amount).toLocaleString()}원</li>
        </ul>
        <p>셀러 대시보드에서 주문을 확인해 주세요.</p>`
      );
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("결제 확인 오류:", error);
    return NextResponse.json(
      { error: "결제 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
