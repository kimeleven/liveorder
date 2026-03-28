import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  return NextResponse.json(seller);
}
