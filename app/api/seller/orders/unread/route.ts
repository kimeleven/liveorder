import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 }, { status: 401 })
  }

  const count = await prisma.order.count({
    where: {
      code: { product: { sellerId: session.user.id } },
      status: 'PAID',
    },
  })

  return NextResponse.json({ count })
}
