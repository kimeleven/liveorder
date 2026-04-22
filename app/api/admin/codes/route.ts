import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parsePagination, buildPaginationResponse } from '@/lib/pagination'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = parsePagination(searchParams)
    const isActiveParam = searchParams.get('isActive')
    const statusParam = searchParams.get('status') // active | expired | inactive | all
    const q = searchParams.get('q')

    const now = new Date()
    const where: Record<string, unknown> = {}

    if (q) {
      where.OR = [
        { codeKey: { contains: q, mode: 'insensitive' } },
        { product: { name: { contains: q, mode: 'insensitive' } } },
      ]
    }

    if (isActiveParam === 'true') where.isActive = true
    if (isActiveParam === 'false') where.isActive = false

    if (statusParam === 'inactive') {
      where.isActive = false
    } else if (statusParam === 'expired') {
      where.isActive = true
      where.expiresAt = { lt: now }
    } else if (statusParam === 'active') {
      where.isActive = true
      where.expiresAt = { gte: now }
    }

    const [data, total] = await Promise.all([
      prisma.code.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          codeKey: true,
          expiresAt: true,
          maxQty: true,
          usedQty: true,
          isActive: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              name: true,
              seller: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
      prisma.code.count({ where }),
    ])

    return NextResponse.json(buildPaginationResponse(data, total, page, limit))
  } catch (err) {
    console.error('[admin/codes GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
