import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    where: { sellerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description, price, stock, category, imageUrl } = body;

    if (!name || !price || !category) {
      return NextResponse.json(
        { error: "상품명, 가격, 카테고리는 필수입니다." },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        sellerId: session.user.id,
        name,
        description,
        price: Number(price),
        stock: Number(stock) || 0,
        category,
        imageUrl,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("상품 등록 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
