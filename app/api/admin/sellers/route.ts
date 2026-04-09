import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SellerStatus } from "@prisma/client";
import { parsePagination, buildPaginationResponse } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const q = searchParams.get("q")?.trim() ?? "";
  const { page, limit, skip } = parsePagination(searchParams);

  const statusFilter =
    statusParam &&
    Object.values(SellerStatus).includes(statusParam as SellerStatus)
      ? { status: statusParam as SellerStatus }
      : {};

  const searchFilter = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { businessNo: { contains: q, mode: "insensitive" as const } },
          { repName: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const where = { ...statusFilter, ...searchFilter };

  const [total, sellers] = await Promise.all([
    prisma.seller.count({ where }),
    prisma.seller.findMany({
      where,
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
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json(buildPaginationResponse(sellers, total, page, limit));
}
