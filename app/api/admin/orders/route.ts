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
  const statusParam = searchParams.get("status");
  const q = searchParams.get("q")?.trim() ?? "";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const { page, limit, skip } = parsePagination(searchParams);

  const validStatuses = ["PAID", "SHIPPING", "DELIVERED", "SETTLED", "REFUNDED"];
  const statusFilter =
    statusParam && validStatuses.includes(statusParam)
      ? { status: statusParam as OrderStatus }
      : {};

  const searchFilter = q
    ? {
        OR: [
          { buyerName: { contains: q, mode: "insensitive" as const } },
          { buyerPhone: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const dateFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
          },
        }
      : {};

  const where = { ...statusFilter, ...searchFilter, ...dateFilter };

  const [total, data] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        code: {
          include: {
            product: {
              select: { name: true, seller: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json(buildPaginationResponse(data, total, page, limit));
}
