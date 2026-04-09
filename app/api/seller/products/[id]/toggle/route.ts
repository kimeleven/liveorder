import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id, sellerId: session.user.id },
  });
  if (!product)
    return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });

  const updated = await prisma.product.update({
    where: { id },
    data: { isActive: !product.isActive },
  });

  return NextResponse.json({ isActive: updated.isActive });
}
