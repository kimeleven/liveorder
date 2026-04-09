import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SettlementStatus } from "@prisma/client";

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

  const settlements = await prisma.settlement.findMany({
    where,
    include: {
      seller: { select: { name: true, businessNo: true, email: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: 10000,
  });

  const header =
    "정산ID,셀러,사업자번호,거래금액,플랫폼수수료,PG수수료,실지급액,상태,정산예정일,정산완료일,생성일\n";
  const statusLabel: Record<string, string> = {
    PENDING: "대기",
    COMPLETED: "완료",
    FAILED: "실패",
  };

  const rows = settlements
    .map((s) =>
      [
        s.id,
        s.seller.name,
        s.seller.businessNo,
        s.amount,
        s.fee,
        s.pgFee,
        s.netAmount,
        statusLabel[s.status] ?? s.status,
        new Date(s.scheduledAt).toLocaleDateString("ko-KR"),
        s.settledAt ? new Date(s.settledAt).toLocaleDateString("ko-KR") : "",
        new Date(s.createdAt).toLocaleDateString("ko-KR"),
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const bom = "\uFEFF";
  const csv = bom + header + rows;
  const suffix =
    from && to
      ? `_${from}_${to}`
      : from
      ? `_from_${from}`
      : to
      ? `_to_${to}`
      : "";
  const filename = `settlements${suffix}_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
