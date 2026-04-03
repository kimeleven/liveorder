// POST /api/buyer/data-deletion
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
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
