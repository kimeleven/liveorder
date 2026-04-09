import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parsePagination, buildPaginationResponse } from '@/lib/pagination'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const { page, limit, skip } = parsePagination(searchParams)
  const isActiveParam = searchParams.get('isActive')
  const sellerId = searchParams.get('sellerId')
  const q = searchParams.get('q')

  const where: Record<string, unknown> = {}
  if (isActiveParam === 'true') where.isActive = true
  if (isActiveParam === 'false') where.isActive = false
  if (sellerId) where.sellerId = sellerId
  if (q) where.name = { contains: q, mode: 'insensitive' }

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        isActive: true,
        category: true,
        imageUrl: true,
        createdAt: true,
        seller: { select: { id: true, name: true, email: true } },
        _count: { select: { codes: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  return NextResponse.json(buildPaginationResponse(data, total, page, limit))
}
