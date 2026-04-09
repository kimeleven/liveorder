import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SettlementStatus } from "@prisma/client";
import { parsePagination, buildPaginationResponse } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const sellerId = searchParams.get("sellerId");
  const { page, limit, skip } = parsePagination(searchParams);

  const statusFilter =
    statusParam &&
    Object.values(SettlementStatus).includes(statusParam as SettlementStatus)
      ? { status: statusParam as SettlementStatus }
      : {};

  const dateFilter =
    from || to
      ? {
          scheduledAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
          },
        }
      : {};

  const where = {
    ...statusFilter,
    ...dateFilter,
    ...(sellerId ? { sellerId } : {}),
  };

  const [total, settlements] = await Promise.all([
    prisma.settlement.count({ where }),
    prisma.settlement.findMany({
      where,
      include: { seller: { select: { name: true, businessNo: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json(buildPaginationResponse(settlements, total, page, limit));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronSecret = process.env.CRON_SECRET;
  const baseUrl = process.env.NEXTAUTH_URL ?? `https://${req.headers.get("host")}`;

  const res = await fetch(`${baseUrl}/api/cron/settlements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(data);
}
