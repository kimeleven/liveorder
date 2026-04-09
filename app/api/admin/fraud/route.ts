import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface SuspiciousIpRow {
  buyer_ip: string;
  order_count: number;
  first_at: Date;
  last_at: Date;
  order_ids: string[];
}

interface SuspiciousPhoneRow {
  buyer_phone: string;
  order_count: number;
  total_amount: number;
  first_at: Date;
  last_at: Date;
  order_ids: string[];
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pattern A: 동일 IP에서 1시간 내 5건 이상 주문
  const suspiciousIps = await prisma.$queryRaw<SuspiciousIpRow[]>`
    SELECT buyer_ip, COUNT(*)::int AS order_count,
           MIN(created_at) AS first_at, MAX(created_at) AS last_at,
           array_agg(id::text) AS order_ids
    FROM orders
    WHERE buyer_ip IS NOT NULL
      AND created_at >= NOW() - INTERVAL '1 hour'
    GROUP BY buyer_ip
    HAVING COUNT(*) >= 5
    ORDER BY order_count DESC
    LIMIT 50
  `;

  // Pattern B: 동일 전화번호에서 30분 내 3건 이상 + 합계 300,000원 이상
  const suspiciousPhones = await prisma.$queryRaw<SuspiciousPhoneRow[]>`
    SELECT buyer_phone, COUNT(*)::int AS order_count,
           SUM(amount)::int AS total_amount,
           MIN(created_at) AS first_at, MAX(created_at) AS last_at,
           array_agg(id::text) AS order_ids
    FROM orders
    WHERE created_at >= NOW() - INTERVAL '30 minutes'
    GROUP BY buyer_phone
    HAVING COUNT(*) >= 3 AND SUM(amount) >= 300000
    ORDER BY total_amount DESC
    LIMIT 50
  `;

  return NextResponse.json({ suspiciousIps, suspiciousPhones });
}
