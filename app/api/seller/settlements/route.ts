import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settlements = await prisma.settlement.findMany({
    where: { sellerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(settlements);
}
