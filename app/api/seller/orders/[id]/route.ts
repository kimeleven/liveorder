import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const order = await prisma.order.findFirst({
    where: {
      id,
      code: { product: { sellerId: session.user.id } },
    },
    select: {
      id: true,
      buyerName: true,
      buyerPhone: true,
      address: true,
      addressDetail: true,
      memo: true,
      quantity: true,
      amount: true,
      status: true,
      pgTid: true,
      trackingNo: true,
      carrier: true,
      source: true,
      createdAt: true,
      code: {
        select: {
          codeKey: true,
          product: {
            select: { name: true, price: true },
          },
        },
      },
    },
  })

  if (!order) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json(order)
}
