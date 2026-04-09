import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OrderStatus } from "@prisma/client";

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

  const orders = await prisma.order.findMany({
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
    take: 10000,
  });

  const statusLabel: Record<string, string> = {
    PAID: "결제완료",
    SHIPPING: "배송중",
    DELIVERED: "배송완료",
    SETTLED: "정산완료",
    REFUNDED: "환불",
  };

  const header = "주문ID,셀러,상품명,구매자,연락처,배송지,수량,금액,상태,주문일시\n";
  const rows = orders
    .map((o) =>
      [
        o.id,
        o.code.product.seller.name,
        o.code.product.name,
        o.buyerName,
        o.buyerPhone,
        `${o.shippingAddress} ${o.shippingAddressDetail ?? ""}`.trim(),
        o.quantity,
        o.amount,
        statusLabel[o.status] ?? o.status,
        new Date(o.createdAt).toLocaleString("ko-KR"),
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const fromPart = from ?? "all";
  const toPart = to ?? new Date().toISOString().slice(0, 10);
  const filename = `orders_${fromPart}_${toPart}.csv`;

  return new NextResponse("\uFEFF" + header + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
