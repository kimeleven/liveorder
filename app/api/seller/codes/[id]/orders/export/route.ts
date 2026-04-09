import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // 소유 검증
  const code = await prisma.code.findFirst({
    where: { id, product: { sellerId: session.user.id } },
    select: { codeKey: true },
  })
  if (!code)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const orders = await prisma.order.findMany({
    where: { codeId: id },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  })

  const header = '주문ID,주문일시,수령인,연락처,주소,상세주소,배송메모,수량,금액,상태,운송장,주문경로\n'
  const rows = orders
    .map((o) =>
      [
        o.id,
        new Date(o.createdAt).toLocaleString('ko-KR'),
        o.buyerName,
        o.buyerPhone,
        o.address,
        o.addressDetail ?? '',
        o.memo ?? '',
        o.quantity,
        o.amount,
        o.status,
        o.trackingNo ?? '',
        o.source === 'kakao' ? '카카오' : '웹',
      ]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n')

  const bom = '\uFEFF'
  const csv = bom + header + rows
  const filename = `orders_${code.codeKey}_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
