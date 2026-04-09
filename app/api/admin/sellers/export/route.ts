import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SellerStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const q = searchParams.get("q")?.trim() ?? "";

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

  const sellers = await prisma.seller.findMany({
    where: { ...statusFilter, ...searchFilter },
    select: {
      id: true,
      email: true,
      name: true,
      repName: true,
      businessNo: true,
      phone: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10000,
  });

  const statusLabel: Record<string, string> = {
    PENDING: "승인대기",
    APPROVED: "승인완료",
    SUSPENDED: "정지",
  };

  const header = "셀러ID,상호명,대표자,이메일,사업자번호,전화번호,상태,가입일\n";
  const rows = sellers
    .map((s) =>
      [
        s.id,
        s.name,
        s.repName,
        s.email,
        s.businessNo,
        s.phone,
        statusLabel[s.status] ?? s.status,
        new Date(s.createdAt).toLocaleDateString("ko-KR"),
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const bom = "\uFEFF";
  const csv = bom + header + rows;
  const filename = `sellers_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
