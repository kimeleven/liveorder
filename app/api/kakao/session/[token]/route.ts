import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const session = await prisma.kakaoPaySession.findUnique({
    where: { token },
    include: {
      code: {
        include: { product: { include: { seller: true } } },
      },
    },
  })

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: '만료된 링크입니다.' }, { status: 410 })
  }

  // 일회성 토큰: 사용 즉시 삭제 (재사용 방지)
  await prisma.kakaoPaySession.delete({ where: { token } })

  const { code } = session
  const product = code.product
  const seller = product.seller

  return NextResponse.json({
    valid: true,
    code: {
      id: code.id,
      codeKey: code.codeKey,
      maxQty: code.maxQty,
      usedQty: code.usedQty,
      remainingQty: code.maxQty === 0 ? null : code.maxQty - code.usedQty,
    },
    product: {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
    },
    seller: {
      id: seller.id,
      name: seller.name,
      businessNo: seller.businessNo,
      tradeRegNo: seller.tradeRegNo,
    },
  })
}
