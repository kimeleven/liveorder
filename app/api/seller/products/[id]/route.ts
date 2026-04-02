import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getSellerProduct(sellerId: string, productId: string) {
  return prisma.product.findFirst({
    where: { id: productId, sellerId },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await getSellerProduct(session.user.id, id);
  if (!product) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getSellerProduct(session.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { name, description, price, stock, category } = body;

    if (!name || !price || !category) {
      return NextResponse.json(
        { error: "상품명, 가격, 카테고리는 필수입니다." },
        { status: 400 }
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price: Number(price),
        stock: Number(stock) || 0,
        category,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("상품 수정 오류:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getSellerProduct(session.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
