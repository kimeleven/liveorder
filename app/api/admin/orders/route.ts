import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OrderStatus } from "@prisma/client";
import { parsePagination, buildPaginationResponse } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;

  const validStatuses = ["PAID", "SHIPPING", "DELIVERED", "SETTLED", "REFUNDED"];
  const where = status && validStatuses.includes(status) ? { status: status as OrderStatus } : {};

  const { page, limit, skip } = parsePagination(searchParams);

  const [data, total] = await Promise.all([
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
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json(buildPaginationResponse(data, total, page, limit));
}
