// POST /api/buyer/data-deletion
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// IP-based in-memory rate limit: max 5 requests per hour per IP
// Note: serverless cold starts reset this map — not perfect but blocks simple scripted abuse
const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(ip);
  if (!entry || entry.resetAt < now) {
    RATE_LIMIT_MAP.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: '요청 한도를 초과했습니다. 1시간 후 다시 시도해 주세요.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const { name, phone } = body as { name?: string; phone?: string };

  if (!name || !phone) {
    return NextResponse.json({ error: '이름과 전화번호를 입력해 주세요.' }, { status: 400 });
  }

  // 정산 무결성 유지를 위해 금액/수량 등 거래 데이터는 보존하고 개인식별 정보만 마스킹
  const result = await prisma.order.updateMany({
    where: { buyerPhone: phone, buyerName: name },
    data: {
      buyerName: '[삭제됨]',
      buyerPhone: '[삭제됨]',
      address: '[삭제됨]',
      addressDetail: '[삭제됨]',
      memo: '[삭제됨]',
    },
  });

  return NextResponse.json({ deleted: result.count });
}
