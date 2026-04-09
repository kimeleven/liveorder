import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

const CODE_PATTERN = /[A-Z0-9]{3}-[0-9]{4}-[A-Z0-9]{4}/

function simpleTextResponse(text: string) {
  return NextResponse.json({
    version: '2.0',
    template: { outputs: [{ simpleText: { text } }] },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // 봇 ID 검증 (환경변수 설정 시에만 검증 — 개발 환경에서는 KAKAO_BOT_ID 미설정으로 스킵)
    const expectedBotId = process.env.KAKAO_BOT_ID
    if (expectedBotId) {
      const botId = body?.bot?.id
      if (botId !== expectedBotId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const utterance: string = body?.userRequest?.utterance ?? ''

    const match = utterance.toUpperCase().match(CODE_PATTERN)
    if (!match) {
      return simpleTextResponse('상품 코드를 입력해주세요.\n예: ABC-1234-ABCD')
    }

    const codeKey = match[0]

    const code = await prisma.code.findUnique({
      where: { codeKey },
      include: { product: { include: { seller: true } } },
    })

    if (!code) return simpleTextResponse('존재하지 않는 코드입니다.')
    if (!code.isActive) return simpleTextResponse('비활성화된 코드입니다.')
    if (code.expiresAt < new Date()) return simpleTextResponse('만료된 코드입니다.')
    if (code.maxQty > 0 && code.usedQty >= code.maxQty) return simpleTextResponse('품절된 상품입니다.')
    if (code.product.seller.status !== 'APPROVED') return simpleTextResponse('판매 중단된 상품입니다.')

    // 세션 토큰 생성 (32자 hex, 30분 만료)
    const token = crypto.randomBytes(16).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    await prisma.kakaoPaySession.create({
      data: { token, codeId: code.id, expiresAt },
    })

    const paymentUrl = `${process.env.NEXTAUTH_URL}/kakao/${token}`
    const product = code.product

    return NextResponse.json({
      version: '2.0',
      template: {
        outputs: [
          {
            commerceCard: {
              description: product.name,
              price: product.price,
              currency: 'won',
              thumbnails: [
                {
                  imageUrl:
                    product.imageUrl ?? 'https://liveorder.vercel.app/og-image.png',
                  link: { web: paymentUrl, mobile_web: paymentUrl },
                },
              ],
              profile: {
                thumbnail: 'https://liveorder.vercel.app/og-image.png',
                nickName: product.seller.name,
              },
              buttons: [
                {
                  label: '결제하기',
                  action: 'webLink',
                  webLinkUrl: paymentUrl,
                },
              ],
            },
          },
        ],
      },
    })
  } catch (err) {
    console.error('[kakao-webhook] Error:', err)
    return simpleTextResponse('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
  }
}
