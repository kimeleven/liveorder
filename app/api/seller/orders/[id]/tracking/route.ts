import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { trackingNo, carrier } = body;

  if (!trackingNo || !carrier) {
    return NextResponse.json(
      { error: "운송장 번호와 택배사를 입력해주세요." },
      { status: 400 }
    );
  }

  const order = await prisma.order.findFirst({
    where: { id, code: { product: { sellerId: session.user.id } } },
  });
  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { trackingNo, carrier, status: "SHIPPING" },
  });

  return NextResponse.json(updated);
}
