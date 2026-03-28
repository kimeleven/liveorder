import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const phone = req.nextUrl.searchParams.get("phone");

  if (!phone) {
    return NextResponse.json(
      { error: "전화번호를 입력해주세요." },
      { status: 400 }
    );
  }

  const order = await prisma.order.findFirst({
    where: { id, buyerPhone: phone },
    include: {
      code: {
        select: {
          codeKey: true,
          product: {
            select: { name: true, price: true },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: "주문을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json(order);
}
