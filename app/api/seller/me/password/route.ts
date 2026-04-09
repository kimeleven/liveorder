import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "비밀번호는 8자 이상이어야 합니다" },
      { status: 400 }
    );
  }

  const seller = await prisma.seller.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });
  if (!seller) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, seller.password);
  if (!valid) {
    return NextResponse.json(
      { error: "현재 비밀번호가 올바르지 않습니다" },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.seller.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ ok: true });
}
