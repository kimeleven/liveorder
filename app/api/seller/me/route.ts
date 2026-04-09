import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seller = await prisma.seller.findUnique({
    where: { id: session.user.id },
    select: {
      status: true,
      name: true,
      email: true,
      repName: true,
      businessNo: true,
      phone: true,
      address: true,
      bankAccount: true,
      bankName: true,
      tradeRegNo: true,
      plan: true,
      createdAt: true,
    },
  });

  if (!seller) {
    return NextResponse.json({ error: "Seller not found" }, { status: 404 });
  }

  return NextResponse.json(seller);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const allowed = [
    "phone",
    "address",
    "bankAccount",
    "bankName",
    "tradeRegNo",
  ] as const;
  const data: Record<string, string> = {};
  for (const key of allowed) {
    if (typeof body[key] === "string") data[key] = body[key].trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const seller = await prisma.seller.update({
    where: { id: session.user.id },
    data,
    select: {
      phone: true,
      address: true,
      bankAccount: true,
      bankName: true,
      tradeRegNo: true,
    },
  });

  return NextResponse.json(seller);
}
