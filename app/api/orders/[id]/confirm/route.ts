import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
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

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  if (order.status !== "TRANSFER_PENDING") {
    return NextResponse.json(
      { error: "송금 대기 상태의 주문만 확인할 수 있습니다." },
      { status: 400 }
    );
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: "CONFIRMED" },
  });

  // 셀러에게 송금 확인 이메일 발송
  const seller = order.code?.product?.seller;
  if (seller) {
    await sendEmail(
      seller.email,
      "[LiveOrder] 구매자 송금 확인 알림",
      `<p>${seller.name} 님, 구매자가 송금을 완료했다고 알렸습니다.</p>
      <ul>
        <li>상품: ${order.code?.product?.name ?? "-"}</li>
        <li>주문자: ${order.buyerName}</li>
        <li>수량: ${order.quantity}개</li>
        <li>금액: ${order.amount.toLocaleString()}원</li>
      </ul>
      <p>입금 여부를 확인 후 배송을 진행해 주세요.</p>`
    );
  }

  return NextResponse.json(updated);
}
