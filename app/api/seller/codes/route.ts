import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const codes = await prisma.code.findMany({
    where: { product: { sellerId: session.user.id } },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(codes);
}
