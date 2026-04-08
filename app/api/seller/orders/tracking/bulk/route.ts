import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const VALID_CARRIERS = ['CJ대한통운', '로젠택배', '한진택배', '롯데택배', '우체국택배']
const TRACKING_NO_REGEX = /^\d{10,15}$/

interface BulkRow {
  orderId: string
  carrier: string
  trackingNo: string
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sellerId = session.user.id

  const body = await req.json()
  const rows: BulkRow[] = body.rows

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: '업로드할 데이터가 없습니다.' }, { status: 400 })
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: '한 번에 최대 500건까지 처리 가능합니다.' }, { status: 400 })
  }

  let success = 0
  const errors: { orderId: string; error: string }[] = []

  for (const row of rows) {
    const { orderId, carrier, trackingNo } = row

    if (!orderId || !carrier || !trackingNo) {
      errors.push({ orderId: orderId ?? '', error: '주문ID, 택배사, 운송장번호는 필수입니다.' })
      continue
    }
    if (!VALID_CARRIERS.includes(carrier)) {
      errors.push({ orderId, error: `지원하지 않는 택배사: ${carrier}` })
      continue
    }
    if (!TRACKING_NO_REGEX.test(trackingNo)) {
      errors.push({ orderId, error: '운송장번호는 숫자 10~15자리입니다.' })
      continue
    }

    try {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          code: { product: { sellerId } },
          status: { in: ['PAID', 'SHIPPING'] },
        },
      })

      if (!order) {
        errors.push({ orderId, error: '주문을 찾을 수 없거나 권한이 없습니다.' })
        continue
      }

      await prisma.order.update({
        where: { id: orderId },
        data: { carrier, trackingNo, status: 'SHIPPING' },
      })
      success++
    } catch {
      errors.push({ orderId, error: '처리 중 오류가 발생했습니다.' })
    }
  }

  return NextResponse.json({ success, failed: errors.length, errors })
}
