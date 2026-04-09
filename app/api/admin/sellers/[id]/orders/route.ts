import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { OrderStatus } from '@prisma/client'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20
  const statusParam = searchParams.get('status') || undefined
  const status = statusParam && Object.values(OrderStatus).includes(statusParam as OrderStatus)
    ? (statusParam as OrderStatus)
    : undefined

  const where = {
    code: { product: { sellerId: id } },
    ...(status ? { status } : {}),
  }

  const [total, data] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      select: {
        id: true, buyerName: true, buyerPhone: true,
        quantity: true, amount: true, status: true,
        trackingNo: true, carrier: true, source: true, createdAt: true,
        code: { select: { codeKey: true, product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({
    data,
    pagination: { page, totalPages: Math.ceil(total / limit), total },
  })
}
