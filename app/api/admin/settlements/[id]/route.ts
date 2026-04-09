import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const settlement = await prisma.settlement.findUnique({
    where: { id },
    select: {
      id: true,
      amount: true,
      fee: true,
      pgFee: true,
      netAmount: true,
      status: true,
      scheduledAt: true,
      settledAt: true,
      createdAt: true,
      seller: {
        select: {
          id: true,
          name: true,
          businessNo: true,
          email: true,
          phone: true,
          bankName: true,
          bankAccount: true,
        },
      },
      orders: {
        select: {
          id: true,
          buyerName: true,
          buyerPhone: true,
          quantity: true,
          amount: true,
          status: true,
          source: true,
          createdAt: true,
          code: {
            select: {
              codeKey: true,
              product: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!settlement) {
    return NextResponse.json({ error: '정산 건을 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json(settlement)
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const settlement = await prisma.settlement.findUnique({ where: { id } })
  if (!settlement) {
    return NextResponse.json({ error: '정산 건을 찾을 수 없습니다.' }, { status: 404 })
  }
  if (settlement.status !== 'PENDING') {
    return NextResponse.json({ error: '대기 중인 정산만 완료 처리할 수 있습니다.' }, { status: 400 })
  }

  const updated = await prisma.settlement.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      settledAt: new Date(),
    },
  })

  return NextResponse.json(updated)
}
