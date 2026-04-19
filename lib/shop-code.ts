import { prisma } from "@/lib/db";

export async function generateShopCode(): Promise<string> {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 5; i++) {
    const code = Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
    const existing = await prisma.seller.findUnique({ where: { shopCode: code } });
    if (!existing) return code;
  }
  throw new Error("shopCode 생성 실패: 5회 재시도 모두 충돌");
}
