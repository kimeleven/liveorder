import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shopCode: string }> }
) {
  const { shopCode } = await params;

  const seller = await prisma.seller.findUnique({
    where: { shopCode },
    select: {
      id: true,
      name: true,
      status: true,
      products: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          description: true,
          imageUrl: true,
          category: true,
          stock: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!seller) {
    return NextResponse.json({ error: "존재하지 않는 shopCode입니다." }, { status: 404 });
  }

  if (seller.status !== "APPROVED") {
    return NextResponse.json({ error: "현재 운영 중이 아닌 쇼핑몰입니다." }, { status: 403 });
  }

  return NextResponse.json({
    id: seller.id,
    name: seller.name,
    products: seller.products,
  });
}
