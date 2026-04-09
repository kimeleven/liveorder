import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OrderStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get('status');
  const statusFilter = statusParam && Object.values(OrderStatus).includes(statusParam as OrderStatus)
    ? { status: statusParam as OrderStatus }
    : {};
  const q = searchParams.get('q')?.trim() || '';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const productId = searchParams.get('productId');

  const dateFilter = (from || to) ? {
    createdAt: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
    }
  } : {};

  const where = {
    code: {
      product: {
        sellerId: session.user.id,
        ...(productId ? { id: productId } : {}),
      },
    },
    ...statusFilter,
    ...dateFilter,
    ...(q ? {
      OR: [
        { buyerName: { contains: q, mode: 'insensitive' as const } },
        { buyerPhone: { contains: q } },
      ]
    } : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    include: {
      code: { select: { codeKey: true, product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 10000,
  });

  const header = "주문ID,주문일시,상품명,코드,수령인,연락처,주소,상세주소,배송메모,수량,금액,상태,운송장,주문경로\n";
  const rows = orders
    .map((o) =>
      [
        o.id,
        new Date(o.createdAt).toLocaleString("ko-KR"),
        o.code.product.name,
        o.code.codeKey,
        o.buyerName,
        o.buyerPhone,
        o.address,
        o.addressDetail ?? "",
        o.memo ?? "",
        o.quantity,
        o.amount,
        o.status,
        o.trackingNo ?? "",
        o.source === 'kakao' ? '카카오' : '웹',
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const bom = "\uFEFF";
  const csv = bom + header + rows;

  // 파일명: 날짜 범위 반영
  const today = new Date().toISOString().slice(0, 10);
  let filename: string;
  if (from && to) {
    filename = `orders_${from}_${to}_${today}.csv`;
  } else if (from) {
    filename = `orders_${from}_${today}.csv`;
  } else if (to) {
    filename = `orders_to_${to}_${today}.csv`;
  } else {
    filename = `orders_${today}.csv`;
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
