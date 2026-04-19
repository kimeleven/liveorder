import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const buyerIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    const body = await req.json();
    const { codeId, buyerName, buyerPhone, address, addressDetail, memo, quantity, amount } = body;

    if (!codeId || !buyerName || !buyerPhone || !address || !quantity || !amount) {
      return NextResponse.json({ error: "필수 항목을 모두 입력해주세요." }, { status: 400 });
    }

    const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
    if (!phoneRegex.test(buyerPhone)) {
      return NextResponse.json(
        { error: "연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)" },
        { status: 400 }
      );
    }

    // 코드 기본 유효성 확인
    const codeCheck = await prisma.code.findUnique({
      where: { id: codeId },
      select: { isActive: true, expiresAt: true },
    });

    if (!codeCheck || !codeCheck.isActive) {
      return NextResponse.json({ error: "유효하지 않은 코드입니다." }, { status: 400 });
    }

    if (codeCheck.expiresAt < new Date()) {
      return NextResponse.json({ error: "만료된 코드입니다." }, { status: 400 });
    }

    // 주문 생성 + 코드 수량 업데이트 (트랜잭션, 레이스 컨디션 방지)
    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
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

        return tx.order.create({
          data: {
            codeId,
            buyerName,
            buyerPhone,
            address,
            addressDetail,
            memo,
            quantity: Number(quantity),
            amount: Number(amount),
            status: "TRANSFER_PENDING",
            source: "web",
            buyerIp,
          },
        });
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
        "[LiveOrder] 새 주문이 접수되었습니다",
        `<p>${seller.name} 님, 새 주문이 접수되었습니다.</p>
        <ul>
          <li>상품: ${codeWithSeller.product.name}</li>
          <li>주문자: ${buyerName}</li>
          <li>수량: ${quantity}개</li>
          <li>금액: ${Number(amount).toLocaleString()}원</li>
        </ul>
        <p>구매자가 송금 완료 후 확인해주세요.</p>
        <p>셀러 대시보드에서 주문을 확인해 주세요.</p>`
      );
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("주문 생성 오류:", error);
    return NextResponse.json({ error: "주문 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
