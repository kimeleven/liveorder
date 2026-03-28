import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const code = await prisma.code.findFirst({
    where: { id, product: { sellerId: session.user.id } },
  });
  if (!code) {
    return NextResponse.json({ error: "코드를 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await prisma.code.update({
    where: { id },
    data: { isActive: !code.isActive },
  });

  return NextResponse.json(updated);
}
