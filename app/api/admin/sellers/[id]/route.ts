import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  if (!["PENDING", "APPROVED", "SUSPENDED"].includes(status)) {
    return NextResponse.json({ error: "유효하지 않은 상태입니다." }, { status: 400 });
  }

  const seller = await prisma.seller.update({
    where: { id },
    data: { status },
  });

  // 감사 로그 기록
  await prisma.sellerAuditLog.create({
    data: {
      sellerId: id,
      action: `STATUS_CHANGE_TO_${status}`,
      detail: { changedBy: session.user.id },
    },
  });

  // 승인/정지 시 셀러에게 이메일 알림
  if (status === 'APPROVED') {
    await sendEmail(
      seller.email,
      '[LiveOrder] 셀러 계정이 승인되었습니다',
      `<p>${seller.name} 님, 셀러 계정이 승인되었습니다.</p>
      <p>지금 바로 로그인하여 상품을 등록하고 코드를 발급해 보세요.</p>`
    );
  } else if (status === 'SUSPENDED') {
    await sendEmail(
      seller.email,
      '[LiveOrder] 셀러 계정이 정지되었습니다',
      `<p>${seller.name} 님, 셀러 계정이 정지되었습니다.</p>
      <p>자세한 사유는 관리자에게 문의해 주세요.</p>`
    );
  }

  return NextResponse.json(seller);
}
