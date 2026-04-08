import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sellers = await prisma.seller.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      repName: true,
      businessNo: true,
      phone: true,
      status: true,
      bizRegImageUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sellers);
}
