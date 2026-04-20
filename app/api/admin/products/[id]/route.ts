import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      stock: true,
      isActive: true,
      category: true,
      imageUrl: true,
      createdAt: true,
      seller: { select: { id: true, name: true, email: true, phone: true } },
      codes: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          codeKey: true,
          expiresAt: true,
          maxQty: true,
          usedQty: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
  })

  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(product)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { isActive } = body

  if (typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'isActive must be boolean' }, { status: 400 })
  }

  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const product = await prisma.product.update({
    where: { id },
    data: { isActive },
    select: { id: true, isActive: true, name: true },
  })

  // 비활성화 시 연결된 활성 코드도 함께 비활성화
  if (!isActive) {
    await prisma.code.updateMany({
      where: { productId: id, isActive: true },
      data: { isActive: false },
    })
  }

  return NextResponse.json(product)
}
