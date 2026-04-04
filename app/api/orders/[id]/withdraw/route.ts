import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, ADMIN_EMAIL } from "@/lib/email";

const WITHDRAW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7일

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let buyerPhone: string;
  try {
    const body = await req.json();
    buyerPhone = body.buyerPhone;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!buyerPhone) {
    return NextResponse.json({ error: "전화번호를 입력해주세요." }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id, buyerPhone },
    include: {
      code: {
        select: {
          codeKey: true,
          product: {
            select: {
              name: true,
              seller: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  if (order.status !== "PAID") {
    return NextResponse.json(
      { error: "결제 완료 상태의 주문만 청약철회가 가능합니다." },
      { status: 400 }
    );
  }

  const elapsed = Date.now() - new Date(order.createdAt).getTime();
  if (elapsed > WITHDRAW_WINDOW_MS) {
    return NextResponse.json(
      { error: "청약철회 신청 기간(7일)이 만료되었습니다." },
      { status: 400 }
    );
  }

  // 관리자에게 청약철회 요청 이메일 발송
  await sendEmail(
    ADMIN_EMAIL,
    `[LiveOrder] 청약철회 신청 — 주문 ${order.id.slice(0, 8).toUpperCase()}`,
    `
    <h2>청약철회 신청이 접수되었습니다</h2>
    <table style="border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;color:#666;">주문번호</td><td>${order.id.toUpperCase()}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">상품</td><td>${order.code.product.name}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">수량</td><td>${order.quantity}개</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">결제금액</td><td>₩${order.amount.toLocaleString()}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">구매자명</td><td>${order.buyerName}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">연락처</td><td>${order.buyerPhone}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">주문일시</td><td>${new Date(order.createdAt).toLocaleString("ko-KR")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">판매자</td><td>${order.code.product.seller.name}</td></tr>
    </table>
    <p style="margin-top:16px;color:#333;">관리자 페이지에서 환불을 처리해주세요.</p>
    `
  );

  return NextResponse.json({
    message: "청약철회 요청이 접수되었습니다. 영업일 3일 이내 처리됩니다.",
  });
}
