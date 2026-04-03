import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { code: { product: { sellerId: session.user.id } } },
    include: {
      code: { select: { codeKey: true, product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 10000,
  });

  const header = "주문일시,상품명,코드,수령인,연락처,주소,상세주소,배송메모,수량,금액,상태,운송장\n";
  const rows = orders
    .map((o) =>
      [
        new Date(o.createdAt).toLocaleString("ko-KR"),
        `"${o.code.product.name}"`,
        o.code.codeKey,
        o.buyerName,
        o.buyerPhone,
        `"${o.address}"`,
        `"${o.addressDetail ?? ""}"`,
        `"${o.memo ?? ""}"`,
        o.quantity,
        o.amount,
        o.status,
        o.trackingNo ?? "",
      ].join(",")
    )
    .join("\n");

  const bom = "\uFEFF";
  const csv = bom + header + rows;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
