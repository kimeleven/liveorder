import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const where = status ? { status: status as string } : {};

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        code: {
          include: {
            product: {
              select: {
                name: true,
                seller: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      skip: (page - 1) * 50,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total });
}
